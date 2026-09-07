// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaEngineStatus {
    pub ffmpeg_available: bool,
    pub ffmpeg_path: String,
    pub ffmpeg_version: String,
    pub ffprobe_available: bool,
    pub ffprobe_path: String,
    pub ffprobe_version: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportRenderResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub error: Option<String>,
    pub stderr: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportProgressPayload {
    pub job_id: String,
    pub line: String,
}

pub struct ExportProcessManager {
    // Map of export job ID -> process ID
    pub processes: Mutex<HashMap<String, u32>>,
}

impl ExportProcessManager {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

fn resolve_executable_path(name: &str) -> Option<PathBuf> {
    // 1. Check sidecar / binary directory adjacent to current executable (packaged app)
    if let Ok(mut exe_dir) = std::env::current_exe() {
        exe_dir.pop();

        // Direct binary: e.g. target/debug/ffmpeg.exe or app/ffmpeg.exe
        let direct_bin = exe_dir.join(format!("{}.exe", name));
        if direct_bin.exists() {
            return Some(direct_bin);
        }

        // Target triple sidecar: e.g. ffmpeg-x86_64-pc-windows-msvc.exe
        let triple_bin = exe_dir.join(format!("{}-x86_64-pc-windows-msvc.exe", name));
        if triple_bin.exists() {
            return Some(triple_bin);
        }

        // Inside binaries subfolder of executable dir
        let sub_bin = exe_dir.join("binaries").join(format!("{}.exe", name));
        if sub_bin.exists() {
            return Some(sub_bin);
        }

        let sub_triple = exe_dir
            .join("binaries")
            .join(format!("{}-x86_64-pc-windows-msvc.exe", name));
        if sub_triple.exists() {
            return Some(sub_triple);
        }
    }

    // 2. Check src-tauri/binaries relative to working directory (development mode)
    let dev_bin_dir = PathBuf::from("src-tauri").join("binaries");
    let dev_triple_bin = dev_bin_dir.join(format!("{}-x86_64-pc-windows-msvc.exe", name));
    if dev_triple_bin.exists() {
        return Some(dev_triple_bin);
    }
    let dev_bin = dev_bin_dir.join(format!("{}.exe", name));
    if dev_bin.exists() {
        return Some(dev_bin);
    }

    let local_bin_dir = PathBuf::from("binaries");
    let local_bin = local_bin_dir.join(format!("{}.exe", name));
    if local_bin.exists() {
        return Some(local_bin);
    }

    // 3. Fallback: Check PATH via 'where.exe' on Windows
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("where.exe").arg(name).output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = stdout.lines().next() {
                    let path = PathBuf::from(first_line.trim());
                    if path.exists() {
                        return Some(path);
                    }
                }
            }
        }

        // 4. Fallback: Check WinGet link location on Windows
        if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
            let winget_path = PathBuf::from(appdata)
                .join("Microsoft")
                .join("WinGet")
                .join("Links")
                .join(format!("{}.exe", name));
            if winget_path.exists() {
                return Some(winget_path);
            }
        }
    }

    // 5. Direct invocation fallback
    if let Ok(output) = Command::new(name).arg("-version").output() {
        if output.status.success() {
            return Some(PathBuf::from(name));
        }
    }

    None
}

fn extract_version(output: &[u8]) -> String {
    let text = String::from_utf8_lossy(output);
    if let Some(first_line) = text.lines().next() {
        first_line.to_string()
    } else {
        "Unknown Version".to_string()
    }
}

#[tauri::command]
fn get_app_info() -> String {
    "FreeCut v1.0.0 - Professional Editing. Zero Barriers.".into()
}

#[tauri::command]
fn get_media_engine_status() -> MediaEngineStatus {
    let mut status = MediaEngineStatus {
        ffmpeg_available: false,
        ffmpeg_path: String::new(),
        ffmpeg_version: String::new(),
        ffprobe_available: false,
        ffprobe_path: String::new(),
        ffprobe_version: String::new(),
    };

    // Safe FFmpeg check
    if let Some(path) = resolve_executable_path("ffmpeg") {
        if let Ok(output) = Command::new(&path).arg("-version").output() {
            if output.status.success() {
                status.ffmpeg_available = true;
                status.ffmpeg_path = path.to_string_lossy().to_string();
                status.ffmpeg_version = extract_version(&output.stdout);
            }
        }
    }

    // Safe FFprobe check
    if let Some(path) = resolve_executable_path("ffprobe") {
        if let Ok(output) = Command::new(&path).arg("-version").output() {
            if output.status.success() {
                status.ffprobe_available = true;
                status.ffprobe_path = path.to_string_lossy().to_string();
                status.ffprobe_version = extract_version(&output.stdout);
            }
        }
    }

    status
}

#[tauri::command]
fn probe_media(file_path: String) -> Result<String, String> {
    if file_path.contains('\0') {
        return Err("Invalid file path: contains null byte".to_string());
    }

    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist on disk: {}", file_path));
    }

    let ffprobe_path = resolve_executable_path("ffprobe")
        .ok_or_else(|| "FFprobe executable not found".to_string())?;

    let output = Command::new(&ffprobe_path)
        .arg("-v")
        .arg("quiet")
        .arg("-print_format")
        .arg("json")
        .arg("-show_format")
        .arg("-show_streams")
        .arg(&file_path)
        .output()
        .map_err(|e| format!("Failed to execute FFprobe: {}", e))?;

    if !output.status.success() {
        let err_text = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFprobe probe error: {}", err_text));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
fn generate_thumbnail(
    video_path: String,
    time_seconds: f64,
    output_path: Option<String>,
) -> Result<String, String> {
    if video_path.contains('\0') {
        return Err("Invalid video path: contains null byte".to_string());
    }

    let video_p = PathBuf::from(&video_path);
    if !video_p.exists() {
        return Err(format!("Source video file does not exist on disk: {}", video_path));
    }

    let ffmpeg_path = resolve_executable_path("ffmpeg")
        .ok_or_else(|| "FFmpeg executable not found".to_string())?;

    let temp_dir = PathBuf::from("temp-thumbs");
    if !temp_dir.exists() {
        let _ = std::fs::create_dir_all(&temp_dir);
    }

    // Secure output path: confine output strictly within temp-thumbs to prevent path traversal
    let safe_output_path = match output_path {
        Some(ref p) if !p.is_empty() && !p.contains('\0') => {
            let user_p = PathBuf::from(p);
            let file_name = user_p.file_name().unwrap_or_else(|| std::ffi::OsStr::new("thumb.jpg"));
            temp_dir.join(file_name)
        }
        _ => {
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            temp_dir.join(format!("thumb_{}.jpg", timestamp))
        }
    };

    let time_str = format!("{:.3}", time_seconds.max(0.0));
    let out_str = safe_output_path.to_string_lossy().to_string();

    let output = Command::new(&ffmpeg_path)
        .arg("-y")
        .arg("-ss")
        .arg(&time_str)
        .arg("-i")
        .arg(&video_path)
        .arg("-vframes")
        .arg("1")
        .arg("-q:v")
        .arg("2")
        .arg(&out_str)
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if !output.status.success() {
        let err_text = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg thumbnail extraction error: {}", err_text));
    }

    Ok(out_str)
}

#[tauri::command]
async fn render_export(
    window: tauri::Window,
    state: tauri::State<'_, Arc<ExportProcessManager>>,
    job_id: Option<String>,
    args: Vec<String>,
) -> Result<ExportRenderResult, String> {
    // Parameter validation: reject null bytes in arguments
    for arg in &args {
        if arg.contains('\0') {
            return Err("Invalid argument: contains null byte".to_string());
        }
    }

    let ffmpeg_path = resolve_executable_path("ffmpeg")
        .ok_or_else(|| "FFmpeg executable not found".to_string())?;

    let mut cmd = Command::new(&ffmpeg_path);
    cmd.args(&args);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn FFmpeg process: {}", e))?;

    let pid = child.id();
    let current_job_id = job_id.unwrap_or_else(|| format!("job_{}", pid));

    // Register active export process for cancellation
    {
        let mut procs = state.processes.lock().unwrap();
        procs.insert(current_job_id.clone(), pid);
    }

    // Stream stderr lines in real-time
    let stderr = child.stderr.take();
    let mut captured_stderr = Vec::new();

    if let Some(stderr_pipe) = stderr {
        let reader = BufReader::new(stderr_pipe);
        for line in reader.lines() {
            if let Ok(line_text) = line {
                // Emit progress event to WebView
                let payload = ExportProgressPayload {
                    job_id: current_job_id.clone(),
                    line: line_text.clone(),
                };
                let _ = window.emit("export-progress", payload);

                // Keep rolling buffer of lines for diagnostics
                captured_stderr.push(line_text);
                if captured_stderr.len() > 100 {
                    captured_stderr.remove(0);
                }
            }
        }
    }

    let status = child
        .wait()
        .map_err(|e| format!("Failed waiting for FFmpeg process: {}", e))?;

    // Unregister process
    {
        let mut procs = state.processes.lock().unwrap();
        procs.remove(&current_job_id);
    }

    let success = status.success();
    let exit_code = status.code();
    let full_stderr = captured_stderr.join("\n");

    if success {
        Ok(ExportRenderResult {
            success: true,
            exit_code,
            error: None,
            stderr: Some(full_stderr),
        })
    } else {
        let err_msg = format!("FFmpeg exited with code {:?}", exit_code);
        Ok(ExportRenderResult {
            success: false,
            exit_code,
            error: Some(err_msg),
            stderr: Some(full_stderr),
        })
    }
}

#[tauri::command]
fn cancel_export(
    state: tauri::State<'_, Arc<ExportProcessManager>>,
    job_id: String,
) -> Result<bool, String> {
    let mut procs = state.processes.lock().unwrap();
    if let Some(pid) = procs.remove(&job_id) {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &pid.to_string()])
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = Command::new("kill")
                .args(&["-9", &pid.to_string()])
                .output();
        }
        return Ok(true);
    }
    Ok(false)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CacheCleanResult {
    pub deleted_count: usize,
    pub freed_bytes: u64,
    pub errors: Vec<String>,
}

#[tauri::command]
fn verify_path_exists(file_path: String) -> bool {
    if file_path.contains('\0') {
        return false;
    }
    let path = PathBuf::from(&file_path);
    path.exists() && path.is_file()
}

#[tauri::command]
fn clean_temp_cache(max_age_seconds: Option<u64>) -> CacheCleanResult {
    let max_age = max_age_seconds.unwrap_or(86400); // 24 hours default
    let mut result = CacheCleanResult {
        deleted_count: 0,
        freed_bytes: 0,
        errors: Vec::new(),
    };

    let mut candidate_dirs = Vec::new();
    candidate_dirs.push(PathBuf::from("temp-thumbs"));
    if let Ok(mut exe_dir) = std::env::current_exe() {
        exe_dir.pop();
        candidate_dirs.push(exe_dir.join("temp-thumbs"));
    }

    let now = std::time::SystemTime::now();

    for dir in candidate_dirs {
        if dir.exists() && dir.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    // Conservative safety: only remove .jpg, .jpeg, .png, .tmp files inside temp-thumbs
                    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                        let ext_lower = ext.to_lowercase();
                        if ext_lower == "jpg" || ext_lower == "jpeg" || ext_lower == "png" || ext_lower == "tmp" {
                            if let Ok(metadata) = entry.metadata() {
                                if let Ok(modified) = metadata.modified() {
                                    if let Ok(age) = now.duration_since(modified) {
                                        if age.as_secs() >= max_age {
                                            let file_size = metadata.len();
                                            if let Err(e) = std::fs::remove_file(&path) {
                                                result.errors.push(format!("Failed to delete {:?}: {}", path, e));
                                            } else {
                                                result.deleted_count += 1;
                                                result.freed_bytes += file_size;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    result
}

fn main() {
    let export_manager = Arc::new(ExportProcessManager::new());

    tauri::Builder::default()
        .manage(export_manager)
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            get_media_engine_status,
            probe_media,
            generate_thumbnail,
            render_export,
            cancel_export,
            verify_path_exists,
            clean_temp_cache
        ])
        .run(tauri::generate_context!())
        .expect("error while running FreeCut desktop application");
}
