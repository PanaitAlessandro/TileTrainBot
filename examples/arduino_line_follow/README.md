# Arduino Uno — classic PID line-follower (no ML)

For teams just getting started. Reads a 5-sensor IR bar, computes centroid error, runs a PID loop on wheel commands. **No TileTrainBot model required** — included as a baseline so students can compare against their trained models.

## Wiring

| Signal | Pin |
|---|---|
| IR0–IR4 | A0–A4 |
| L motor IN1 / IN2 / PWM | 4 / 5 / 6 |
| R motor IN1 / IN2 / PWM | 7 / 8 / 9 |

## Calibration

On boot the code samples 2 seconds of ambient readings; sweep the bar over both white tile and black line during that window. Values are normalized per-sensor to the observed min/max.

Tune `KP`, `KD` in `main.ino` for your chassis. Typical starting point: `KP=0.35, KD=0.15`.
