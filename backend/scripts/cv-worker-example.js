/**
 * Example CV Worker Script
 * This demonstrates how your Python CV processing service can automatically
 * trigger tracker analytics creation when processing completes.
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

/**
 * Function to be called by your Python CV script when processing completes
 * @param {string} videoId - The video ID that was processed
 * @param {Object} cvResults - The results from your CV processing
 */
async function onCVProcessingComplete(videoId, cvResults) {
  try {
    const payload = {
      videoId,
      drillId: cvResults.drillId || null,
      analytics: cvResults.analytics.map(tracker => ({
        tracker_id: tracker.trackerId,
        top_speed: tracker.topSpeed,
        distance_covered: tracker.distanceCovered,
        thumbnail_url: tracker.thumbnailUrl || `/uploads/thumbnails/track_${tracker.trackerId}.jpg`
      }))
    };

    console.log('Sending CV results to backend:', payload);

    const response = await axios.post(`${API_BASE_URL}/videos/${videoId}/auto-tracker-analytics`, payload);
    
    console.log('✅ Tracker analytics created successfully:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Failed to create tracker analytics:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage - this would be called from your Python CV processing pipeline
async function exampleCVWorkflow() {
  // Simulate CV processing results
  const mockCVResults = {
    drillId: 'drill_101',
    analytics: [
      {
        trackerId: 1,
        topSpeed: 31.4,
        distanceCovered: 45.2,
        thumbnailUrl: '/uploads/thumbnails/track_1.jpg'
      },
      {
        trackerId: 2,
        topSpeed: 28.1,
        distanceCovered: 41.0,
        thumbnailUrl: '/uploads/thumbnails/track_2.jpg'
      }
    ]
  };

  // When CV processing completes, automatically trigger analytics creation
  const videoId = 'your-video-id-here';
  await onCVProcessingComplete(videoId, mockCVResults);
}

// Export for use in your actual CV processing service
module.exports = { onCVProcessingComplete };

// If running this script directly
if (require.main === module) {
  exampleCVWorkflow().catch(console.error);
}
