# 1. Enable Required Google API Services
resource "google_project_service" "services" {
  service            = "run.googleapis.com" # Cloud Run API
  disable_on_destroy = false
}

# 3. Provision Google Cloud Run v2 Service
resource "google_cloud_run_v2_service" "service" {
  depends_on = [google_project_service.services]
  name       = var.service_name
  location   = var.region
  ingress    = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      # Initial placeholder image before CI/CD runs. 
      # GitHub actions will deploy the built production images to this service subsequently.
      image = "us-docker.pkg.dev/cloudrun/container/hello:latest"

      ports {
        container_port = 8080
      }

      # Inject API Keys into container runtime.
      # The custom Nginx startup CMD will intercept these and seed them into compiled static code.
      env {
        name  = "VITE_API_KEY"
        value = var.vite_api_key
      }

      env {
        name  = "VITE_GEMINI_API_KEY"
        value = var.vite_gemini_api_key
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }
    }

    scaling {
      max_instance_count = 10
      min_instance_count = 0
    }
  }

  # Allow external traffic allocations to route to latest revisions automatically
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  # Ignore external changes to the container image so that GitHub Actions deployments
  # do not get reverted during subsequent terraform apply runs.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }
}

# 4. Grant Unauthenticated (Public) Access to Cloud Run Service
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.service.name
  location = google_cloud_run_v2_service.service.location
  role     = "roles/run.viewer"
  member   = "allUsers"
}
