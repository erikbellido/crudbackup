# Guía: Backups automáticos de Supabase a Google Drive

Este proyecto tiene 3 workflows de GitHub Actions que hacen `pg_dump` de tu base
de datos en Supabase y suben el archivo `.sql.gz` a una carpeta de tu Google Drive:

| Workflow | Frecuencia | Carpeta en Drive | Retención |
|---|---|---|---|
| `backup-5min.yml` | cada 5 minutos* | `backups-zapateria/cada-5min/` | últimas 6 horas |
| `backup-hourly.yml` | cada hora | `backups-zapateria/por-hora/` | últimos 7 días |
| `backup-daily.yml` | 8:00 AM (CDMX) | `backups-zapateria/diario/` | últimos 90 días |

> \* GitHub Actions solo permite programar cada 5 minutos como mínimo, y en repos
> gratuitos los horarios pueden retrasarse algunos minutos en horas de carga.

---

## Paso 1 — Crear el proyecto de Google Cloud

1. Entra a <https://console.cloud.google.com>.
2. Arriba a la izquierda, junto al logo, abre el selector de proyectos → **New project**.
3. Nombre sugerido: `backups-zapateria` → **Create**.
4. Selecciona ese proyecto en el selector.

## Paso 2 — Habilitar la API de Google Drive

1. Menú ☰ → **APIs & Services → Library**.
2. Busca **Google Drive API** → ábrela → **Enable**.

## Paso 3 — Configurar la pantalla de consentimiento OAuth

1. Menú ☰ → **APIs & Services → OAuth consent screen**.
2. User type: **Internal** (si tu cuenta es personal, elige **External** y luego
   añade tu propio correo en *Test users*; no necesita verificación para uso propio).
3. App name: `Backups Zapatería` → guarda.

## Paso 4 — Crear las credenciales OAuth (Client ID + Secret)

1. **APIs & Services → Credentials → + Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. En **Authorized redirect URIs** añade exactamente:
   `http://127.0.0.1:53682/`
4. **Create** → copia los dos valores:
   - *Client ID* → será el secret `GDRIVE_CLIENT_ID`
   - *Client Secret* → será el secret `GDRIVE_CLIENT_SECRET`

## Paso 5 — Generar el token de rclone en tu PC (una sola vez)

1. Instala rclone: <https://rclone.org/downloads/> (en Windows: descomprime y
   usa `rclone.exe` en una terminal).
2. En tu PC ejecuta:

   ```bash
   rclone config
   ```

   y responde así:
   - `n` (nuevo remoto)
   - name: `gdrive`
   - tipo de storage: busca `drive` (opción de Google Drive)
   - `client_id`: pega tu Client ID
   - `client_secret`: pega tu Client Secret
   - `scope`: `drive.file`
   - `root_folder_id`: (vacío, Enter)
   - `service_account_file`: (vacío, Enter)
   - `Edit advanced config?`: `n`
   - `Use auto config?`: `s` (config remota) → `y`
   - Copia la URL que imprime (viene con `http://127.0.0.1:53682/...`), ábrela
     en el navegador, inicia sesión con la cuenta de Google donde quieres los
     backups y concede el permiso.
   - Vuelve a la terminal: rclone recibirá el token. Verifica con
     `rclone lsd gdrive:` que lista tu Drive → `q` para salir.

   > Si tu PC no puede abrir el puerto 53682 (Windows lo suele permitir bien),
   > hazlo desde otra máquina o WSL con `--rc` según la doc de rclone.

3. Abre el archivo de configuración que rclone acaba de crear:
   - Windows: `%APPDATA%\rclone\rclone.conf`
   - Linux/macOS: `~/.config/rclone/rclone.conf`
4. Busca la sección `[gdrive]` y copia **todo el valor** de la línea `token =`
   (es un JSON en una sola línea: `{"access_token":"...","token_type":"Bearer","refresh_token":"...","expiry":"..."}`).
   Ese valor completo será el secret `GDRIVE_TOKEN`.

## Paso 6 — Crear la carpeta de backups en Drive

1. Entra a <https://drive.google.com> con esa misma cuenta.
2. Crea la carpeta **`backups-zapateria`** (o deja que rclone la cree sola la
   primera vez; el nombre se puede cambiar con la variable `GDRIVE_FOLDER`).
3. Dentro crea (opcional, rclone también las crea solo): `cada-5min`, `por-hora`, `diario`.

> El scope `drive.file` solo ve los archivos que crea rclone: tus demás
> documentos de Drive quedan inaccesibles para los workflows.

## Paso 7 — Guardar los secrets en GitHub

Entra a `https://github.com/erikbellido/crudbackup/settings/secrets/actions`
y en **New repository secret** crea **4 secrets**:

| Nombre | Valor |
|---|---|
| `GDRIVE_CLIENT_ID` | Client ID del paso 4 |
| `GDRIVE_CLIENT_SECRET` | Client Secret del paso 4 |
| `GDRIVE_TOKEN` | El JSON completo del token del paso 5 (`{"access_token":...}`) |
| `DATABASE_URL` | Tu cadena del **pooler** de Supabase (la misma de Render) |

## Paso 8 — Activar y probar

1. Los workflows ya están en `.github/workflows/` del repo.
2. Para probar sin esperar al horario: pestaña **Actions** →
   elige "Backup cada 5 minutos → Google Drive" → **Run workflow** → **Run workflow**.
3. Abre el run y verifica que el paso "Mostrar últimos backups subidos" lista
   el archivo `.sql.gz`.
4. Revisa tu Google Drive: `backups-zapateria/cada-5min/backup_5min_....sql.gz`.
5. Repite la prueba manual con `backup-hourly` y `backup-daily`.

> **Importante:** el primer push de estos workflows activa los horarios; GitHub
> ejecuta los `cron` de repos públicos aunque no haya cambios nuevos. En repos
> privados gratuitos tienes 2 000 minutos/mes de Actions — cada backup tarda
> ~1 min, así que el de 5 min consume ~8 600 min/mes: actívalo solo si tienes
> minutos de sobra, o cámbialo a cada 15-30 min editando su `cron`.

## Cómo restaurar un backup

1. Descarga el `.sql.gz` que quieras desde Drive.
2. Descomprímelo y ejecútalo contra una base limpia:

   ```bash
   gunzip backup_daily_XXXX.sql.gz
   psql "postgresql://usuario:password@host:5432/postgres" -f backup_daily_XXXX.sql
   ```

   (Los dumps usan `--clean --if-exists`, así que restauran sobre tablas existentes.)

## Preguntas frecuentes

- **¿Los horarios van exactos?** GitHub los puede retrasar en horas pico; no es
  un scheduler de precisión. Si necesitas minutos exactos, migra a un VPS con cron.
- **¿Puedo cambiar la carpeta de Drive?** Sí: crea la variable de repositorio
  `GDRIVE_FOLDER` (Settings → Secrets and variables → Actions → Variables) con
  el nombre que quieras.
- **¿Y si falla la subida?** El run aparece en rojo en Actions y te llega un
  email de GitHub (notificaciones por defecto).
