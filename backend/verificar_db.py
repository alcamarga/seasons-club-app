from app import app, db
from usuario import Usuario

with app.app_context():
    db.create_all()
    print("¡Éxito! Tabla 'usuarios' creada o verificada.")