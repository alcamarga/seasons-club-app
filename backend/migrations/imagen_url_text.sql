-- Ampliar imagen_url para rutas /static/uploads (evitar truncar base64 en VARCHAR(500))
ALTER TABLE producto ALTER COLUMN imagen_url TYPE TEXT;
