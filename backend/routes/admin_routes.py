from flask import Blueprint, jsonify, request as flask_request, current_app
from database import db
from usuario import Usuario
from models.insumo import Insumo 
from models.producto import Producto, SizeEnum
from models.receta import Receta 
from flask_cors import cross_origin
import jwt as pyjwt
from password_utils import hash_password

admin_bp = Blueprint('admin', __name__)

ROLES_PERMITIDOS = ('admin', 'mesero')

# --- UTILIDADES ---
def _verificar_token_admin():
    encabezado = flask_request.headers.get('Authorization', '')
    if not encabezado.startswith('Bearer '):
        return None, (jsonify({'error': 'Token requerido o inválido'}), 401)
    try:
        token = encabezado.split()[1]
        payload = pyjwt.decode(
            token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256'],
        )
        rol = (payload.get('role') or payload.get('rol') or '').lower()
        if rol != 'admin':
            return None, (jsonify({'error': 'Acceso solo para administradores'}), 403)
        return payload, None
    except Exception:
        return None, (jsonify({'error': 'Token requerido o inválido'}), 401)


def _serializar_usuario(u: Usuario) -> dict:
    return {
        'id': u.id,
        'nombre': u.nombre,
        'email': u.email,
        'rol': u.rol,
    }


def _validar_rol(rol: str):
    if rol not in ROLES_PERMITIDOS:
        return jsonify({'error': f'Rol inválido. Use: {", ".join(ROLES_PERMITIDOS)}'}), 400
    return None


def _asignar_contrasena_hash(usuario: Usuario, plain_password: str) -> tuple[dict | None, int | None]:
    """Hashea con bcrypt antes de persistir. Evita Invalid salt en login."""
    if not plain_password or len(str(plain_password)) < 6:
        return {'error': 'La contraseña debe tener al menos 6 caracteres'}, 400
    usuario.contrasena_hash = hash_password(str(plain_password))
    return None, None


# --- RUTAS DE USUARIOS / EMPLEADOS ---
@admin_bp.route('/usuarios', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
def gestionar_usuarios():
    if flask_request.method == 'OPTIONS':
        return jsonify({}), 200

    payload, err = _verificar_token_admin()
    if err:
        return err

    if flask_request.method == 'POST':
        try:
            datos = flask_request.get_json() or {}
            nombre = (datos.get('nombre') or '').strip()
            email = (datos.get('email') or '').strip().lower()
            rol = (datos.get('rol') or 'mesero').lower()
            pass_plana = datos.get('password') or datos.get('contrasena')

            if not nombre or not email or not pass_plana:
                return jsonify({'error': 'Nombre, email y contraseña son obligatorios'}), 400

            err_rol = _validar_rol(rol)
            if err_rol:
                return err_rol

            if Usuario.query.filter_by(email=email).first():
                return jsonify({'error': 'El correo ya está registrado'}), 409

            nuevo = Usuario(
                nombre=nombre,
                email=email,
                rol=rol,
                contrasena_hash=hash_password(str(pass_plana)),
            )
            db.session.add(nuevo)
            db.session.commit()
            return jsonify({
                'mensaje': 'Usuario creado',
                'usuario': _serializar_usuario(nuevo),
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    usuarios = Usuario.query.all()
    return jsonify({'usuarios': [_serializar_usuario(u) for u in usuarios]}), 200


@admin_bp.route('/usuarios/<int:usuario_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
def gestionar_usuario_id(usuario_id):
    if flask_request.method == 'OPTIONS':
        return jsonify({}), 200

    payload, err = _verificar_token_admin()
    if err:
        return err

    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    if flask_request.method == 'PUT':
        try:
            datos = flask_request.get_json() or {}
            if 'nombre' in datos:
                usuario.nombre = (datos.get('nombre') or '').strip()
            if 'email' in datos:
                email = (datos.get('email') or '').strip().lower()
                otro = Usuario.query.filter(
                    Usuario.email == email,
                    Usuario.id != usuario_id,
                ).first()
                if otro:
                    return jsonify({'error': 'El correo ya está en uso'}), 409
                usuario.email = email
            if 'rol' in datos:
                rol = (datos.get('rol') or '').lower()
                err_rol = _validar_rol(rol)
                if err_rol:
                    return err_rol
                if usuario.rol == 'admin' and rol != 'admin':
                    admins = Usuario.query.filter_by(rol='admin').count()
                    if admins <= 1:
                        return jsonify({'error': 'No se puede quitar el último administrador'}), 400
                usuario.rol = rol
            nueva_pass = datos.get('password') or datos.get('contrasena') or datos.get('nueva_contrasena')
            if nueva_pass:
                err_body, err_code = _asignar_contrasena_hash(usuario, nueva_pass)
                if err_body:
                    return jsonify(err_body), err_code
            db.session.commit()
            return jsonify({
                'mensaje': 'Usuario actualizado',
                'usuario': _serializar_usuario(usuario),
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    if flask_request.method == 'DELETE':
        try:
            if usuario.rol == 'admin':
                if Usuario.query.filter_by(rol='admin').count() <= 1:
                    return jsonify({'error': 'No se puede eliminar el último administrador'}), 400
            sub = payload.get('sub') or payload.get('id')
            if sub and int(sub) == usuario.id:
                return jsonify({'error': 'No puedes eliminar tu propia cuenta'}), 400
            db.session.delete(usuario)
            db.session.commit()
            return jsonify({'mensaje': 'Usuario eliminado'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500


@admin_bp.route('/usuarios/<int:usuario_id>/reset-password', methods=['POST', 'OPTIONS'])
@cross_origin()
def reset_password_usuario(usuario_id):
    if flask_request.method == 'OPTIONS':
        return jsonify({}), 200

    _, err = _verificar_token_admin()
    if err:
        return err

    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    datos = flask_request.get_json() or {}
    nueva = datos.get('nueva_contrasena') or datos.get('password') or datos.get('contrasena')
    if not nueva or len(str(nueva)) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400

    err_body, err_code = _asignar_contrasena_hash(usuario, str(nueva))
    if err_body:
        return jsonify(err_body), err_code

    db.session.commit()
    return jsonify({'mensaje': 'Contraseña actualizada'}), 200


@admin_bp.route('/usuarios/<int:usuario_id>/rol', methods=['PATCH', 'OPTIONS'])
@cross_origin()
def cambiar_rol_usuario(usuario_id):
    if flask_request.method == 'OPTIONS':
        return jsonify({}), 200

    _, err = _verificar_token_admin()
    if err:
        return err

    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    datos = flask_request.get_json() or {}
    rol = (datos.get('rol') or '').lower()
    err_rol = _validar_rol(rol)
    if err_rol:
        return err_rol

    if usuario.rol == 'admin' and rol != 'admin':
        if Usuario.query.filter_by(rol='admin').count() <= 1:
            return jsonify({'error': 'No se puede quitar el último administrador'}), 400

    usuario.rol = rol
    db.session.commit()
    return jsonify({
        'mensaje': 'Rol actualizado',
        'usuario': _serializar_usuario(usuario),
    }), 200

# --- RUTAS DE INSUMOS ---
@admin_bp.route('/insumos', methods=['GET', 'POST', 'OPTIONS'])
@admin_bp.route('/insumos/<int:insumo_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
def gestionar_insumos(insumo_id=None):
    if flask_request.method == 'OPTIONS': return jsonify({}), 200
    
    # GET: Listar todos
    if flask_request.method == 'GET':
        try:
            todos = Insumo.query.all()
            return jsonify([i.to_dict() for i in todos]), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # POST: Crear nuevo
    if flask_request.method == 'POST':
        try:
            datos = flask_request.get_json()
            precio_val = datos.get('precio_unitario') or datos.get('precio') or 0
            nuevo = Insumo(
                nombre=datos.get('nombre'),
                cantidad=float(datos.get('cantidad', 0)),
                unidad=datos.get('unidad') or datos.get('unidad_medida') or 'gr',

                precio_unitario=float(precio_val),
                stock_minimo=float(datos.get('stock_minimo', 0))
            )
            db.session.add(nuevo)
            db.session.commit()
            return jsonify(nuevo.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    # PUT: Actualizar
    if flask_request.method == 'PUT' and insumo_id:
        try:
            insumo = Insumo.query.get(insumo_id)
            if not insumo: return jsonify({'error': 'No encontrado'}), 404
            datos = flask_request.get_json()
            insumo.nombre = datos.get('nombre', insumo.nombre)
            insumo.cantidad = float(datos.get('cantidad', insumo.cantidad))
            # Capturamos 'unidad' o 'unidad_medida' para sincronizar con el Front
            if 'unidad' in datos:
                insumo.unidad = datos['unidad']
            elif 'unidad_medida' in datos:
                insumo.unidad = datos['unidad_medida']

            if 'precio_unitario' in datos or 'precio' in datos:
                insumo.precio_unitario = float(datos.get('precio_unitario') or datos.get('precio'))
            insumo.stock_minimo = float(datos.get('stock_minimo', insumo.stock_minimo))
            db.session.commit()
            return jsonify({'mensaje': 'Actualizado'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    # DELETE: Borrar
    if flask_request.method == 'DELETE' and insumo_id:
        insumo = Insumo.query.get(insumo_id)
        if insumo:
            db.session.delete(insumo)
            db.session.commit()
            return jsonify({'mensaje': 'Eliminado'}), 200
        return jsonify({'error': 'No encontrado'}), 404

# --- RUTAS DE PIZZAS / PRODUCTOS ---
@admin_bp.route('/pizzas', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
def get_pizzas():
    if flask_request.method == 'OPTIONS': return jsonify({}), 200
    
    if flask_request.method == 'POST':
        try:
            datos = flask_request.get_json()
            
            # Helper para conversión segura
            def safe_float(v):
                try:
                    return float(v) if v is not None and v != "" else 0.0
                except:
                    return 0.0

            nuevo = Producto(
                nombre=datos.get('nombre'),
                descripcion=datos.get('descripcion'),
                categoria=datos.get('categoria', 'Pizza'),
                precio_pequena=safe_float(datos.get('precio_1') or datos.get('precio_personal')),
                precio_mediana=safe_float(datos.get('precio_2') or datos.get('precio_mediano')),
                precio_grande=safe_float(datos.get('precio_3') or datos.get('precio_familiar')),
                precio_base=safe_float(datos.get('precio_1') or datos.get('precio_personal'))
            )


            db.session.add(nuevo)
            db.session.commit()
            return jsonify(nuevo.serializar()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    pizzas = Producto.query.all()
    return jsonify([p.serializar() for p in pizzas]), 200

@admin_bp.route('/pizzas/<int:pizza_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
def gestionar_producto_especifico(pizza_id):
    if flask_request.method == 'OPTIONS': return jsonify({}), 200
    
    producto = Producto.query.get(pizza_id)
    if not producto:
        return jsonify({'error': 'Producto no encontrado'}), 404

    # ACTUALIZAR (PUT)
    if flask_request.method == 'PUT':
        try:
            datos = flask_request.get_json()
            producto.nombre = datos.get('nombre', producto.nombre)
            producto.descripcion = datos.get('descripcion', producto.descripcion)
            producto.categoria = datos.get('categoria', producto.categoria)
            
            # Mapeo de precios desde el Frontend (Soporta ambos estilos)
            # Usamos un helper para conversión segura y evitar Error 500
            def safe_float(v):
                try:
                    return float(v) if v is not None and v != "" else 0.0
                except:
                    return 0.0

            if 'precio_1' in datos or 'precio_personal' in datos:
                val = datos.get('precio_1') or datos.get('precio_personal')
                producto.precio_pequena = safe_float(val)
                producto.precio_base = producto.precio_pequena
            
            if 'precio_2' in datos or 'precio_mediano' in datos:
                val = datos.get('precio_2') or datos.get('precio_mediano')
                producto.precio_mediana = safe_float(val)
            
            if 'precio_3' in datos or 'precio_familiar' in datos:
                val = datos.get('precio_3') or datos.get('precio_familiar')
                producto.precio_grande = safe_float(val)


            db.session.commit()
            return jsonify({'mensaje': '¡Actualizado con éxito!'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    # ELIMINAR (DELETE)
    if flask_request.method == 'DELETE':
        try:
            db.session.delete(producto)
            db.session.commit()
            return jsonify({'mensaje': 'Producto eliminado correctamente'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# --- RUTAS DE RECETAS ---
@admin_bp.route('/pizzas/<int:pizza_id>/receta', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
def gestionar_receta(pizza_id):
    if flask_request.method == 'OPTIONS': return jsonify({}), 200
    tamano = flask_request.args.get('size', 'Pequeña')

    if flask_request.method == 'GET':
        try:
            ingredientes = Receta.query.filter_by(pizza_id=pizza_id, tamano=tamano).all()
            return jsonify([item.to_dict() for item in ingredientes]), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    if flask_request.method == 'POST':
        try:
            datos = flask_request.get_json()
            Receta.query.filter_by(pizza_id=pizza_id, tamano=tamano).delete()
            for item in datos:
                nueva_linea = Receta(
                    pizza_id=pizza_id,
                    insumo_id=item['insumo_id'],
                    tamano=tamano,
                    cantidad_gastada=item['cantidad_gastada']
                )
                db.session.add(nueva_linea)
            db.session.commit()
            return jsonify({'mensaje': 'Receta guardada'}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# --- RENTABILIDAD ---
@admin_bp.route('/admin/rentabilidad', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_rentabilidad():
    if flask_request.method == 'OPTIONS': return jsonify({}), 200
    
    # Capturamos el tamaño del Front
    tamano_solicitado = flask_request.args.get('size', None)

    # Mapeo de equivalencias para que el Front cargue todo correctamente
    equivalencias = {
        'Pequeña': ['Pequeña', 'Personal'],
        'Mediana': ['Mediana', 'Litro'],
        'Familiar': ['Familiar', 'Grande']
    }

    
    # Obtenemos la lista de etiquetas aceptadas según el filtro solicitado
    etiquetas_aceptadas = equivalencias.get(tamano_solicitado, [tamano_solicitado]) if tamano_solicitado else None
    
    try:
        productos = Producto.query.all()
        resultado = []

        def get_etiquetas(cat):
            if cat == 'Pizza': return ['Personal', 'Mediana', 'Familiar']
            if cat == 'Gaseosa': return ['Personal', 'Litro', 'Familiar']
            if cat == 'Lasaña': return ['Pequeña', 'Grande', '']
            return ['Único', '', '']

        for p in productos:
            etiquetas = get_etiquetas(p.categoria)
            opciones = [
                {'nombre': etiquetas[0], 'precio': p.precio_pequena},
                {'nombre': etiquetas[1], 'precio': p.precio_mediana},
                {'nombre': etiquetas[2], 'precio': p.precio_grande}
            ]

            for opt in opciones:
                if not opt['precio'] or opt['precio'] <= 0 or not opt['nombre']:
                    continue
                
                # Filtrado flexible: si hay filtro, buscamos en la lista de equivalencias
                if etiquetas_aceptadas and opt['nombre'] not in etiquetas_aceptadas:
                    continue

                
                receta_items = Receta.query.filter_by(pizza_id=p.id, tamano=opt['nombre']).all()
                
                costo_insumos = 0
                for item in receta_items:
                    if item.insumo:
                        costo_insumos += item.cantidad_gastada * item.insumo.precio_unitario
                
                ganancia_neta = float(opt['precio']) - costo_insumos
                porcentaje_margen = (ganancia_neta / float(opt['precio'])) * 100 if opt['precio'] > 0 else 0

                resultado.append({
                    'id': p.id,
                    'nombre': p.nombre,
                    'categoria': p.categoria,
                    'tamano': opt['nombre'],
                    'costo_produccion': round(costo_insumos, 2),
                    'precio_venta': float(opt['precio']),
                    'ganancia': round(ganancia_neta, 2),
                    'margen_porcentaje': round(porcentaje_margen, 2)
                })


        resumen = {
            'total_items': len(resultado),
            'margen_promedio': round(sum(i['margen_porcentaje'] for i in resultado) / len(resultado), 2) if resultado else 0,
            'tamano_filtrado': tamano_solicitado
        }


        return jsonify({
            'productos': resultado,
            'resumen': resumen
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
