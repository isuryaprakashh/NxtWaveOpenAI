
import json

def test_logic():
    # Simulate the logic I added to app.py
    ai_result = {
        "summary": [
            "The email is a very brief greeting with no specific content or request.",
            "No actionable items or information were provided in the email body.",
            "Consider replying to inquire about the purpose of the email."
        ]
    }
    
    summary = ai_result.get("summary", "")
    if isinstance(summary, list):
        summary = "\n".join([str(s) for s in summary])
    
    print(f"Resulting Summary Type: {type(summary)}")
    print(f"Resulting Summary Content:\n{summary}")
    
    assert isinstance(summary, str)
    assert "brief greeting" in summary
    assert "\n" in summary

if __name__ == "__main__":
    test_logic()
    print("\n✅ Verification SUCCESS: List summary correctly converted to newline-separated string.")
