use std::path::{Path, PathBuf};

pub const DEFAULT_MODEL_FILE: &str = "ggml-base-q5_1.bin";
pub const DEFAULT_MODEL_ID: &str = "base-q5_1";

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperModelStatus {
    pub installed: bool,
    pub model_id: String,
    pub file_name: String,
    pub path: String,
    pub size_bytes: u64,
    pub models_dir: String,
}

pub fn resolve_models_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("VELOX_MODELS_DIR") {
        return PathBuf::from(dir);
    }

    if let Ok(cwd) = std::env::current_dir() {
        if let Some(found) = find_models_dir_from(&cwd) {
            return found;
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if let Some(found) = find_models_dir_from(parent) {
                return found;
            }
        }
    }

    default_models_dir()
}

fn find_models_dir_from(start: &Path) -> Option<PathBuf> {
    let mut current = Some(start);

    while let Some(dir) = current {
        let candidate = dir.join("models");
        if candidate.is_dir() {
            return Some(candidate);
        }
        current = dir.parent();
    }

    None
}

fn default_models_dir() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("models")
}

pub fn default_model_path() -> PathBuf {
    resolve_models_dir().join(DEFAULT_MODEL_FILE)
}

pub fn get_whisper_model_status() -> WhisperModelStatus {
    let models_dir = resolve_models_dir();
    let path = models_dir.join(DEFAULT_MODEL_FILE);

    if !path.is_file() {
        return WhisperModelStatus {
            installed: false,
            model_id: DEFAULT_MODEL_ID.to_string(),
            file_name: DEFAULT_MODEL_FILE.to_string(),
            path: path.display().to_string(),
            size_bytes: 0,
            models_dir: models_dir.display().to_string(),
        };
    }

    let size_bytes = std::fs::metadata(&path).map(|meta| meta.len()).unwrap_or(0);

    WhisperModelStatus {
        installed: true,
        model_id: DEFAULT_MODEL_ID.to_string(),
        file_name: DEFAULT_MODEL_FILE.to_string(),
        path: path.display().to_string(),
        size_bytes,
        models_dir: models_dir.display().to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_model_path_uses_models_subdirectory() {
        let path = default_model_path();
        assert!(path.ends_with(DEFAULT_MODEL_FILE));
        assert!(path.parent().is_some_and(|parent| parent.ends_with("models")));
    }
}
