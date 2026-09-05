use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Serialize)]
struct PlatformInfo {
    os: String,
    family: String,
}

fn io_error(action: &str, err: impl std::fmt::Display) -> String {
    format!("{action} : {err}")
}

#[tauri::command]
fn platform_info() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS.to_string(),
        family: std::env::consts::FAMILY.to_string(),
    }
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| io_error("Impossible de lire le fichier", e))
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| io_error("Impossible de créer le dossier", e))?;
        }
    }
    fs::write(&path, contents).map_err(|e| io_error("Impossible d'enregistrer le fichier", e))
}

#[tauri::command]
fn write_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| io_error("Impossible de créer le dossier", e))?;
        }
    }
    fs::write(&path, contents).map_err(|e| io_error("Impossible d'écrire le fichier", e))
}

#[tauri::command]
fn open_in_os(path: String) -> Result<(), String> {
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(&path).spawn()
    } else {
        Command::new("xdg-open").arg(&path).spawn()
    };

    result
        .map(|_| ())
        .map_err(|e| format!("Impossible d'ouvrir le fichier : {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            platform_info,
            read_text_file,
            write_text_file,
            write_binary_file,
            open_in_os
        ])
        .run(tauri::generate_context!())
        .expect("erreur au démarrage de Markout");
}
