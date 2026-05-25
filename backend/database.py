from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine

# Creamos la instancia
db = SQLAlchemy()

# IMPORTANTE: Para que funcione, necesitamos acceder a la configuración del engine.
# Agrega esta función para configurar la resiliencia de la base de datos
def configure_db(app):
    # 'pool_pre_ping=True' es lo que soluciona el error SSL
    # 'pool_recycle' evita que la conexión se cierre por tiempo
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,
        'pool_size': 10,
        'max_overflow': 20
    }
    db.init_app(app)