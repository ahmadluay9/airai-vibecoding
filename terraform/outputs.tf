output "cloud_run_url" {
  description = "The public URL of the deployed Luminair Cloud Run service."
  value       = google_cloud_run_v2_service.service.uri
}
