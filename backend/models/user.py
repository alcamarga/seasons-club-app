"""Modelo ORM para la tabla users (autenticación)."""

from database import db


class User(db.Model):
    """Usuario del sistema. role solo admite ADMIN o WAITER."""

    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)

    def serializar(self) -> dict:
        """Formato compatible con el frontend (sin password_hash)."""
        rol_frontend = 'admin' if self.role == 'ADMIN' else 'mesero'
        return {
            'id': self.id,
            'nombre': self.username,
            'email': self.username,
            'rol': rol_frontend,
        }
