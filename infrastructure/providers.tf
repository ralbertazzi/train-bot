locals {
  project_id = "trains-bot-42"
}

provider "google" {
  project = local.project_id
  region  = "us-central1"
}
