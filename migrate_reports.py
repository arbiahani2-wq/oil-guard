import os
import json

OUTPUTS_DIR = r"d:\oil-spill-detection2\outputs"

def migrate_reports():
    if not os.path.exists(OUTPUTS_DIR):
        print("Outputs dir not found")
        return

    for item in os.listdir(OUTPUTS_DIR):
        report_path = os.path.join(OUTPUTS_DIR, item, "reports", "report.json")
        if os.path.exists(report_path):
            try:
                with open(report_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                changed = False
                
                # Migrate spills -> spill_polygons
                if "spills" in data:
                    data["spill_polygons"] = data.pop("spills")
                    changed = True
                    
                # Migrate risk_level -> risk_report object
                if "risk_level" in data:
                    level = data.pop("risk_level", "UNKNOWN")
                    score = data.pop("risk_score", 0)
                    reasons = data.pop("risk_reasons", [])
                    
                    # Estimate the specific levels since we don't have them in old reports
                    # We'll just put the overall level in all of them so it displays something valid
                    data["risk_report"] = {
                        "level": level,
                        "score": score,
                        "infrastructure_level": level,
                        "infrastructure_score": score,
                        "pollution_level": level,
                        "pollution_score": score,
                        "reasons": reasons
                    }
                    changed = True
                    
                # Migrate infrastructures to have both type and fac_type
                if "nearest_infrastructures" in data:
                    for inf in data["nearest_infrastructures"]:
                        if "fac_type" not in inf:
                            inf["fac_type"] = inf.get("type", "Unknown")
                            changed = True
                        if "type" not in inf:
                            ft = inf.get("fac_type", "").lower()
                            if "well" in ft:
                                inf["type"] = "Well"
                            else:
                                inf["type"] = "Platform"
                            changed = True
                            
                # Ensure image_path exists for older reports
                if "image_path" not in data:
                    data["image_path"] = "Unknown"
                    changed = True
                    
                if changed:
                    with open(report_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=4)
                    print(f"Migrated {report_path}")
                else:
                    print(f"Already migrated {report_path}")
            except Exception as e:
                print(f"Error migrating {report_path}: {e}")

if __name__ == "__main__":
    migrate_reports()
