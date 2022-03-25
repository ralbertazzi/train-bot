resource "google_project_service" "container_registry" {
  service = "containerregistry.googleapis.com"
}

resource "google_project_service" "cloud_run" {
  service = "run.googleapis.com"
}
