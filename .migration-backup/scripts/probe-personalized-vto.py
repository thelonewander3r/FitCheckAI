"""Verifies personalized virtual try-on: session WITH a selfie embeds the photo
in the mock VTO preview; a demo session (no selfie) still gets the placeholder.
Usage: python3 scripts/probe-personalized-vto.py  (dev server on :3000)
"""
import base64
import json
import sys
import urllib.request

BASE = "http://localhost:3000"
SELFIE_PATH = ".data/selfie-test.jpg"

def post(path, payload):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return r.status, json.loads(r.read().decode())

def get(path):
    with urllib.request.urlopen(BASE + path) as r:
        return json.loads(r.read().decode())

def svg_from_data_url(url):
    """Strip data:image/svg+xml;base64, prefix and decode to text."""
    if not url or "base64," not in url:
        return None
    return base64.b64decode(url.split("base64,", 1)[1]).decode("utf-8", "replace")

def run():
    # --- 1. Session WITH selfie -------------------------------------------------
    with open(SELFIE_PATH, "rb") as f:
        selfie = base64.b64encode(f.read()).decode()
    intake = {
        "jobTitle": "Data Analyst",
        "companyName": "Acme Corp",
        "industry": "Financial Services",
        "jobDescription": "We are looking for a data analyst to join our team. The role involves dashboards, SQL, and presenting to leadership.",
        "interviewStage": "final",
        "interviewFormat": "onsite",
        "interviewDate": "2026-08-20",
        "budget": 200,
        "stylePreference": "classic",
        "candidateName": "Selfie Tester",
    }
    status, resp = post("/api/sessions", {**intake, "imageBase64": selfie})
    sid = resp.get("sessionId")
    print(f"1. session with selfie: POST={status} id={sid[:8]}...")
    assert status == 201 and sid, "session creation failed"

    status, sess = post(f"/api/sessions/{sid}/try-on", {"outfitId": "outfit-005"})
    print(f"2. try-on: POST={status}")
    assert status == 200, "try-on failed"

    sess = get(f"/api/sessions/{sid}")
    api_has_img = "userImageBase64" in sess
    print(f"3. selfie NOT echoed in API response: {'YES' if not api_has_img else 'NO'}")
    assert not api_has_img, "selfie leaked in API response (privacy)"

    import json
    on_disk = json.load(open(".data/sessions.json"))[sid]
    stored_img = on_disk.get("userImageBase64", "")
    print(f"3b. selfie persisted server-side: {len(stored_img)} chars -> {'YES' if len(stored_img) > 100 else 'NO'}")
    assert len(stored_img) > 100, "selfie not persisted on session"

    url = sess["tryOnResults"]["outfit-005"]["renderedImageUrl"]
    svg = svg_from_data_url(url)
    print(f"4. rendered URL length: {len(url)} chars")
    has_image = svg is not None and '<image href="data:image/jpeg;base64,' in svg
    print(f"5. photo embedded in preview: {'YES' if has_image else 'NO'}")
    assert has_image, "user photo not embedded in mock VTO preview"

    # --- 2. Demo session (no selfie) -------------------------------------------
    _, demo = post("/api/demo", {})
    did = demo.get("sessionId")
    _, _ = post(f"/api/sessions/{did}/try-on", {"outfitId": "outfit-005"})
    dsess = get(f"/api/sessions/{did}")
    durl = dsess["tryOnResults"]["outfit-005"]["renderedImageUrl"]
    dsvg = svg_from_data_url(durl)
    has_image = dsvg is not None and "<image href=" in dsvg
    print(f"6. demo (no selfie) still uses placeholder: {'YES' if not has_image else 'NO'}")
    assert not has_image, "demo session unexpectedly embedded an image"

    print("\nPERSONALIZED VTO: ALL CHECKS PASSED")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
