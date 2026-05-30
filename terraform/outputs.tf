output "cloud_run_url" {
  description = "The public URL of the deployed Luminair Cloud Run service."
  value       = google_cloud_run_v2_service.service.uri
}

output "artifact_registry_repo" {
  description = "The fully qualified path of the Artifact Registry repository."
  value       = "${google_artifact_registry_repository.repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.name}"
}
