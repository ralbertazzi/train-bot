resource "google_cloud_run_service" "instance" {
  name     = "trains-bot"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/trains-bot-42/trains-bot:latest"
        resources {
          limits = {
            "cpu"    = 1
            "memory" = "128Mi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "1"
      }
    }
  }
}

resource "google_cloud_run_service_iam_member" "all_users" {
  location = google_cloud_run_service.instance.location
  service  = google_cloud_run_service.instance.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
