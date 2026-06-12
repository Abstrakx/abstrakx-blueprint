# Skema Database & Keamanan

Sistem backend menggunakan Supabase (PostgreSQL) yang dirancang untuk sinkronisasi seketika antar anggota tim.

## Entity Relationship Diagram (ERD)

Berikut adalah struktur relasional utama yang menopang _workspace_ ini:

```mermaid
erDiagram
    PROJECTS ||--o{ TEAM_MEMBERS : houses
    PROJECTS ||--o{ TASKS : assigns
    PROJECTS ||--o{ COMPILED_NOTES : contains

    PROJECTS {
        uuid id PK
        string name
        string github_repo "e.g., Abstrakx/abstrakx-blueprint"
        string docs_dir "default: docs"
    }

    TEAM_MEMBERS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        string name
        string role "owner, developer, viewer"
        string title "custom designation"
        string avatar_color
    }

    TASKS {
        uuid id PK
        uuid project_id FK
        string text
        string assignee
        boolean done
    }
```

## Row Level Security (RLS)

Keamanan tabel diatur dengan sangat ketat di level baris (Row Level Security):

- `projects`: Hanya anggota tim yang memiliki `user_id` di `team_members` yang dapat membaca atau memodifikasi tugas di dalam sebuah project.
- Pengguna yang masuk dengan akun Google secara otomatis diberikan peran `viewer`, sementara autentikasi GitHub memberikan hak akses `developer`.

💡 NOTE: All - Ketika menjalankan migrasi SQL baru, pastikan trigger RLS auth.users selalu dicek ulang agar integrasi OAuth login tetap mulus.
