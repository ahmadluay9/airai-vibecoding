variable "project_id" {
  type        = string
  description = "The Google Cloud Project ID where resources will be provisioned."
}

variable "region" {
  type        = string
  description = "The GCP region where the Artifact Registry and Cloud Run service will reside."
  default     = "us-central1"
}

variable "service_name" {
  type        = string
  description = "The name of the Cloud Run service."
  default     = "luminair"
}

variable "vite_api_key" {
  type        = string
  description = "The OpenWeatherMap API Key for weather and air quality polling."
  sensitive   = true
}

variable "vite_gemini_api_key" {
  type        = string
  description = "The Google Gemini AI API Key for demographic air quality advisories."
  sensitive   = true
}
