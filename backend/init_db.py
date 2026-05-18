from app import db, app
with app.app_context():
    db.create_all()
    print("✅ ¡Tablas creadas con éxito en la base de datos!")
