use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(serde::Deserialize)]
pub struct TrainArgs {
    pub python: String,
    pub script: String,
    pub dataset: String,
    pub model: String,
    pub epochs: u32,
    pub batch: u32,
    pub lr: f32,
    pub out: String,
    pub event: String,
}

#[derive(serde::Deserialize)]
pub struct ExportArgs {
    pub python: String,
    pub script: String,
    pub model: String,
    pub target: String,
    pub out: String,
    pub event: String,
}

#[tauri::command]
pub async fn run_training(app: AppHandle, args: TrainArgs) -> Result<i32, String> {
    let mut child = Command::new(&args.python)
        .arg(&args.script)
        .arg("--dataset").arg(&args.dataset)
        .arg("--model").arg(&args.model)
        .arg("--epochs").arg(args.epochs.to_string())
        .arg("--batch").arg(args.batch.to_string())
        .arg("--lr").arg(args.lr.to_string())
        .arg("--out").arg(&args.out)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn failed: {e}"))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;
    let event = args.event.clone();
    let app_err = app.clone();
    let event_err = args.event.clone();

    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app.emit(&event, serde_json::json!({ "stream": "stdout", "line": line }));
        }
    });
    tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_err.emit(&event_err, serde_json::json!({ "stream": "stderr", "line": line }));
        }
    });

    let status = child.wait().await.map_err(|e| e.to_string())?;
    Ok(status.code().unwrap_or(-1))
}

#[tauri::command]
pub async fn run_export(app: AppHandle, args: ExportArgs) -> Result<i32, String> {
    let mut child = Command::new(&args.python)
        .arg(&args.script)
        .arg("--model").arg(&args.model)
        .arg("--target").arg(&args.target)
        .arg("--out").arg(&args.out)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn failed: {e}"))?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;
    let event = args.event.clone();
    let app_err = app.clone();
    let event_err = args.event.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app.emit(&event, serde_json::json!({ "stream": "stdout", "line": line }));
        }
    });
    tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_err.emit(&event_err, serde_json::json!({ "stream": "stderr", "line": line }));
        }
    });
    let status = child.wait().await.map_err(|e| e.to_string())?;
    Ok(status.code().unwrap_or(-1))
}

#[tauri::command]
pub async fn detect_python(python: String) -> Result<String, String> {
    let output = Command::new(&python)
        .arg("--version")
        .output()
        .await
        .map_err(|e| format!("not found: {e}"))?;
    let s = String::from_utf8_lossy(if output.stdout.is_empty() { &output.stderr } else { &output.stdout });
    Ok(s.trim().to_string())
}
