from app import app, db
from usuario import Usuario
import bcrypt

def fijar_contrasena(email, nueva_password):
    with app.app_context():
        user = Usuario.query.filter_by(email=email).first()
        if user:
            # Generar hash real
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(nueva_password.encode('utf-8'), salt)
            user.contrasena_hash = hashed.decode('utf-8')
            db.session.commit()
            print(f"Contraseña de {email} actualizada correctamente.")
        else:
            print("Usuario no encontrado.")

# Ejecuta esto con el email de tu mesero
fijar_contrasena('mesero@seasonsclub.com', '123456') # Pon la contraseña que quieras