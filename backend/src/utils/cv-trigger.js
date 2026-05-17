/**
 * Triggers the CV Flask service to start video analysis.
 * This is called after a video is uploaded and saved to the database.
 *
 * The CV service will:
 * 1. Download the video from the provided URL
 * 2. Run the Python CV pipeline (YOLO tracking, speed/distance, jersey OCR, etc.)
 * 3. POST status updates back to PUT /api/videos/:id/analysis-status
 * 4. POST tracker analytics back to POST /api/videos/:id/tracker-analytics
 */

const CV_SERVICE_URL =
  process.env.CV_SERVICE_URL || "http://localhost:5001";

const CV_SHARED_SECRET =
  process.env.CV_SHARED_SECRET || "gc-cv-secret-key";

/**
 * Fire-and-forget trigger. Errors are logged but never thrown so the
 * upload response is not delayed.
 *
 * @param {Object} opts
 * @param {string} opts.videoId   - MongoDB _id of the Video document
 * @param {string} opts.videoUrl  - Publicly-accessible URL of the uploaded video
 * @param {string} opts.token     - Bearer token the CV service uses for callbacks
 * @param {string} [opts.drillId] - Optional drill identifier
 */
async function triggerCVAnalysis({ videoId, videoUrl, token, drillId }) {
  if (!videoUrl) {
    console.warn("[cv-trigger] No videoUrl provided; skipping CV trigger.");
    return;
  }

  const payload = {
    video_url: videoUrl,
    video_id: videoId,
    token: token || "",
    drill_id: drillId || "",
    secret: CV_SHARED_SECRET,
  };

  try {
    // Use native fetch (Node 18+) or fallback to http module
    const response = await fetch(`${CV_SERVICE_URL}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        `[cv-trigger] CV job queued: jobId=${data.job_id}, videoId=${videoId}`,
      );
    } else {
      const text = await response.text();
      console.error(
        `[cv-trigger] CV service returned ${response.status}: ${text}`,
      );
    }
  } catch (error) {
    // Log and swallow — the upload should still succeed even if CV is down
    console.error(
      `[cv-trigger] Failed to reach CV service at ${CV_SERVICE_URL}:`,
      error.message,
    );
  }
}

module.exports = { triggerCVAnalysis };
