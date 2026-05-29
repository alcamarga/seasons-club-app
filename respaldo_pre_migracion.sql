--
-- PostgreSQL database dump
--

\restrict UbCX4I2HxUkLVYiYPbjRTWzKuabGeZxs3tu1u4q8i7cNfoWNa2KmG3l8I6pVf0e

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: corte_caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.corte_caja (
    id integer NOT NULL,
    fecha_corte timestamp without time zone NOT NULL,
    total_ventas double precision NOT NULL,
    efectivo double precision NOT NULL,
    transferencia double precision NOT NULL,
    cantidad_ventas integer NOT NULL
);


ALTER TABLE public.corte_caja OWNER TO postgres;

--
-- Name: corte_caja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.corte_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.corte_caja_id_seq OWNER TO postgres;

--
-- Name: corte_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.corte_caja_id_seq OWNED BY public.corte_caja.id;


--
-- Name: grupo_mesa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupo_mesa (
    id integer NOT NULL,
    mesa_anfitriona_id integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'America/Bogota'::text) NOT NULL,
    closed_at timestamp without time zone,
    CONSTRAINT grupo_mesa_estado_chk CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'cerrado'::character varying])::text[])))
);


ALTER TABLE public.grupo_mesa OWNER TO postgres;

--
-- Name: TABLE grupo_mesa; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.grupo_mesa IS 'Agrupa mesas unidas en una sola cuenta activa (Fase A — unir mesas).';


--
-- Name: grupo_mesa_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupo_mesa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grupo_mesa_id_seq OWNER TO postgres;

--
-- Name: grupo_mesa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupo_mesa_id_seq OWNED BY public.grupo_mesa.id;


--
-- Name: historial_ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_ventas (
    id integer NOT NULL,
    mesa_id integer NOT NULL,
    numero_mesa integer NOT NULL,
    venta_id integer,
    total double precision NOT NULL,
    subtotal double precision NOT NULL,
    iva double precision NOT NULL,
    metodo_pago character varying(50) NOT NULL,
    articulos_json text,
    fecha timestamp without time zone
);


ALTER TABLE public.historial_ventas OWNER TO postgres;

--
-- Name: historial_ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_ventas_id_seq OWNER TO postgres;

--
-- Name: historial_ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_ventas_id_seq OWNED BY public.historial_ventas.id;


--
-- Name: insumos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insumos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    cantidad double precision,
    unidad character varying(20),
    precio_unitario double precision NOT NULL,
    stock_minimo double precision
);


ALTER TABLE public.insumos OWNER TO postgres;

--
-- Name: insumos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insumos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insumos_id_seq OWNER TO postgres;

--
-- Name: insumos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insumos_id_seq OWNED BY public.insumos.id;


--
-- Name: mesa_grupo_miembro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mesa_grupo_miembro (
    id integer NOT NULL,
    grupo_mesa_id integer NOT NULL,
    mesa_id integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    joined_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'America/Bogota'::text) NOT NULL,
    left_at timestamp without time zone
);


ALTER TABLE public.mesa_grupo_miembro OWNER TO postgres;

--
-- Name: TABLE mesa_grupo_miembro; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.mesa_grupo_miembro IS 'Membresía mesa ↔ grupo. activo=TRUE indica pertenencia vigente al grupo.';


--
-- Name: mesa_grupo_miembro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mesa_grupo_miembro_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mesa_grupo_miembro_id_seq OWNER TO postgres;

--
-- Name: mesa_grupo_miembro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mesa_grupo_miembro_id_seq OWNED BY public.mesa_grupo_miembro.id;


--
-- Name: mesas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mesas (
    id integer NOT NULL,
    numero_mesa integer NOT NULL,
    estado character varying(20) NOT NULL,
    grupo_mesa_id integer
);


ALTER TABLE public.mesas OWNER TO postgres;

--
-- Name: COLUMN mesas.grupo_mesa_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mesas.grupo_mesa_id IS 'Grupo activo al que pertenece la mesa (NULL = mesa individual).';


--
-- Name: mesas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mesas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mesas_id_seq OWNER TO postgres;

--
-- Name: mesas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mesas_id_seq OWNED BY public.mesas.id;


--
-- Name: pedido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pedido (
    id integer NOT NULL,
    mesa_id integer NOT NULL,
    usuario_id integer,
    fecha timestamp without time zone,
    total numeric(10,2) NOT NULL,
    estado character varying(50),
    articulos_json text,
    grupo_mesa_id integer,
    tipo character varying(20) DEFAULT 'individual'::character varying NOT NULL,
    pedido_padre_id integer,
    etiqueta character varying(100),
    CONSTRAINT pedido_tipo_chk CHECK (((tipo)::text = ANY ((ARRAY['individual'::character varying, 'maestra'::character varying, 'subcuenta'::character varying])::text[])))
);


ALTER TABLE public.pedido OWNER TO postgres;

--
-- Name: COLUMN pedido.tipo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pedido.tipo IS 'individual | maestra (cuenta consolidada) | subcuenta (división de pago).';


--
-- Name: pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pedido_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pedido_id_seq OWNER TO postgres;

--
-- Name: pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pedido_id_seq OWNED BY public.pedido.id;


--
-- Name: pedido_linea; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pedido_linea (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id integer NOT NULL,
    producto_id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    precio numeric(10,2) NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    mesa_origen_id integer NOT NULL,
    mesa_origen_numero integer NOT NULL,
    estado_linea character varying(20) DEFAULT 'activa'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'America/Bogota'::text) NOT NULL,
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'America/Bogota'::text) NOT NULL,
    CONSTRAINT pedido_linea_cantidad_chk CHECK ((cantidad > 0)),
    CONSTRAINT pedido_linea_estado_chk CHECK (((estado_linea)::text = ANY ((ARRAY['activa'::character varying, 'movida'::character varying, 'facturada'::character varying])::text[]))),
    CONSTRAINT pedido_linea_precio_chk CHECK ((precio >= (0)::numeric))
);


ALTER TABLE public.pedido_linea OWNER TO postgres;

--
-- Name: TABLE pedido_linea; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pedido_linea IS 'Líneas de comanda con trazabilidad por mesa de origen. Fuente de verdad Fase A.';


--
-- Name: COLUMN pedido_linea.mesa_origen_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pedido_linea.mesa_origen_id IS 'Mesa física que pidió el producto (se conserva al unir mesas).';


--
-- Name: producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.producto (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    precio numeric(10,2) NOT NULL,
    descripcion text,
    categoria character varying(50),
    precio_pequena double precision,
    precio_mediana double precision,
    precio_grande double precision,
    precio_compra double precision DEFAULT 0 NOT NULL,
    precio_venta double precision DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    imagen_url text DEFAULT ''::character varying,
    es_insumo boolean DEFAULT false NOT NULL,
    costo_unitario double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public.producto OWNER TO postgres;

--
-- Name: producto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.producto_id_seq OWNER TO postgres;

--
-- Name: producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.producto_id_seq OWNED BY public.producto.id;


--
-- Name: recetas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recetas (
    id integer NOT NULL,
    pizza_id integer NOT NULL,
    insumo_id integer NOT NULL,
    tamano character varying(20) NOT NULL,
    cantidad_gastada double precision NOT NULL
);


ALTER TABLE public.recetas OWNER TO postgres;

--
-- Name: recetas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recetas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recetas_id_seq OWNER TO postgres;

--
-- Name: recetas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recetas_id_seq OWNED BY public.recetas.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(80) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(120) NOT NULL,
    contrasena_hash character varying(255) NOT NULL,
    rol character varying(20)
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- Name: usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_seq OWNER TO postgres;

--
-- Name: usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_seq OWNED BY public.usuario.id;


--
-- Name: venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venta (
    id integer NOT NULL,
    mesa_id integer NOT NULL,
    total_venta double precision NOT NULL,
    metodo_pago character varying(50) NOT NULL,
    fecha timestamp without time zone
);


ALTER TABLE public.venta OWNER TO postgres;

--
-- Name: venta_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.venta_id_seq OWNER TO postgres;

--
-- Name: venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.venta_id_seq OWNED BY public.venta.id;


--
-- Name: corte_caja id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corte_caja ALTER COLUMN id SET DEFAULT nextval('public.corte_caja_id_seq'::regclass);


--
-- Name: grupo_mesa id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo_mesa ALTER COLUMN id SET DEFAULT nextval('public.grupo_mesa_id_seq'::regclass);


--
-- Name: historial_ventas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_ventas ALTER COLUMN id SET DEFAULT nextval('public.historial_ventas_id_seq'::regclass);


--
-- Name: insumos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos ALTER COLUMN id SET DEFAULT nextval('public.insumos_id_seq'::regclass);


--
-- Name: mesa_grupo_miembro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesa_grupo_miembro ALTER COLUMN id SET DEFAULT nextval('public.mesa_grupo_miembro_id_seq'::regclass);


--
-- Name: mesas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesas ALTER COLUMN id SET DEFAULT nextval('public.mesas_id_seq'::regclass);


--
-- Name: pedido id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido ALTER COLUMN id SET DEFAULT nextval('public.pedido_id_seq'::regclass);


--
-- Name: producto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto ALTER COLUMN id SET DEFAULT nextval('public.producto_id_seq'::regclass);


--
-- Name: recetas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recetas ALTER COLUMN id SET DEFAULT nextval('public.recetas_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: usuario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id SET DEFAULT nextval('public.usuario_id_seq'::regclass);


--
-- Name: venta id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta ALTER COLUMN id SET DEFAULT nextval('public.venta_id_seq'::regclass);


--
-- Data for Name: corte_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.corte_caja (id, fecha_corte, total_ventas, efectivo, transferencia, cantidad_ventas) FROM stdin;
1	2026-05-25 16:02:44.805566	260000	132000	128000	5
2	2026-05-26 00:05:26.849955	144000	144000	0	3
\.


--
-- Data for Name: grupo_mesa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupo_mesa (id, mesa_anfitriona_id, estado, created_at, closed_at) FROM stdin;
\.


--
-- Data for Name: historial_ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historial_ventas (id, mesa_id, numero_mesa, venta_id, total, subtotal, iva, metodo_pago, articulos_json, fecha) FROM stdin;
1	1	1	1	20000	16806.72	3193.28	Efectivo	[{"producto_id": 1, "nombre": "Cerveza Corona Extra", "precio": 12000, "cantidad": 1}, {"producto_id": 2, "nombre": "Cerveza Club Colombia Dorada", "precio": 8000, "cantidad": 1}]	2026-05-24 23:15:46.355544
2	2	2	2	60000	50420.17	9579.83	Transferencia	[{"producto_id": 8, "nombre": "Aguardiente Antioque\\u00f1o Media", "precio": 60000, "cantidad": 1}]	2026-05-24 23:45:40.535676
3	3	3	3	52000	43697.48	8302.52	Efectivo	[{"producto_id": 1, "nombre": "Cerveza Corona Extra", "precio": 12000, "cantidad": 2}, {"producto_id": 3, "nombre": "Margarita Classic", "precio": 28000, "cantidad": 1}]	2026-05-25 00:58:06.366656
4	2	2	4	60000	50420.17	9579.83	Efectivo	[{"producto_id": 2, "nombre": "Aguardiente Antioque\\u00f1o Media", "precio": 60000, "cantidad": 1}]	2026-05-25 02:54:14.726083
5	20	20	5	68000	57142.86	10857.14	Transferencia	[{"producto_id": 2, "nombre": "Aguardiente Antioque\\u00f1o Media", "precio": 60000, "cantidad": 1}, {"producto_id": 4, "nombre": "Cerveza Club Colombia Dorada", "precio": 8000, "cantidad": 1}]	2026-05-25 10:59:53.081337
6	1	1	6	12000	10084.03	1915.97	Efectivo	[{"producto_id": 3, "nombre": "Cerveza Corona Extra", "precio": 12000, "cantidad": 1}]	2026-05-25 17:26:03.045511
7	2	2	7	60000	50420.17	9579.83	Efectivo	[{"cantidad": 1, "nombre": "Aguardiente Antioque\\u00f1o Media", "precio": 60000, "producto_id": 2}]	2026-05-25 18:15:44.071887
8	1	1	8	72000	60504.2	11495.8	Efectivo	[{"cantidad": 1, "nombre": "Aguardiente Antioque\\u00f1o Media", "precio": 60000, "producto_id": 2}, {"cantidad": 1, "nombre": "Cerveza Corona Extra", "precio": 12000, "producto_id": 3}]	2026-05-25 18:15:44.071887
9	1	1	9	65000	54621.85	10378.15	Efectivo	[{"cantidad": 1, "nombre": "Ron Viejo de Caldas Media", "precio": 65000, "producto_id": 6}]	2026-05-27 11:50:49.28722
10	1	1	10	12000	10084.03	1915.97	Efectivo	[{"cantidad": 1, "nombre": "Cerveza Corona Extra", "precio": 12000, "producto_id": 3}]	2026-05-27 11:50:49.28722
\.


--
-- Data for Name: insumos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insumos (id, nombre, cantidad, unidad, precio_unitario, stock_minimo) FROM stdin;
\.


--
-- Data for Name: mesa_grupo_miembro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mesa_grupo_miembro (id, grupo_mesa_id, mesa_id, activo, joined_at, left_at) FROM stdin;
\.


--
-- Data for Name: mesas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mesas (id, numero_mesa, estado, grupo_mesa_id) FROM stdin;
4	4	LIBRE	\N
5	5	LIBRE	\N
6	6	LIBRE	\N
7	7	LIBRE	\N
8	8	LIBRE	\N
9	9	LIBRE	\N
10	10	LIBRE	\N
11	11	LIBRE	\N
12	12	LIBRE	\N
13	13	LIBRE	\N
14	14	LIBRE	\N
15	15	LIBRE	\N
16	16	LIBRE	\N
17	17	LIBRE	\N
18	18	LIBRE	\N
19	19	LIBRE	\N
3	3	LIBRE	\N
20	20	LIBRE	\N
1	1	LIBRE	\N
2	2	OCUPADA	\N
\.


--
-- Data for Name: pedido; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pedido (id, mesa_id, usuario_id, fecha, total, estado, articulos_json, grupo_mesa_id, tipo, pedido_padre_id, etiqueta) FROM stdin;
1	1	\N	2026-05-24 23:07:43.603067	0.00	facturado	[]	\N	individual	\N	\N
2	2	\N	2026-05-24 23:25:46.185678	0.00	facturado	[]	\N	individual	\N	\N
3	3	\N	2026-05-25 00:57:22.727162	0.00	facturado	[]	\N	individual	\N	\N
4	2	\N	2026-05-25 02:40:04.705718	0.00	facturado	[]	\N	individual	\N	\N
5	20	\N	2026-05-25 15:37:26.149546	0.00	facturado	[]	\N	individual	\N	\N
6	1	\N	2026-05-25 17:26:03.08565	0.00	facturado	[]	\N	individual	\N	\N
8	2	\N	2026-05-25 18:06:45.601382	60000.00	facturado	[{"producto_id": 2, "nombre": "Aguardiente Antioque\\u00f1o Media", "precio": 60000.0, "cantidad": 1}]	\N	individual	\N	\N
7	1	\N	2026-05-25 18:06:45.601382	72000.00	facturado	[{"producto_id": 2, "nombre": "Aguardiente Antioque\\u00f1o Media", "precio": 60000.0, "cantidad": 1}, {"producto_id": 3, "nombre": "Cerveza Corona Extra", "precio": 12000.0, "cantidad": 1}]	\N	individual	\N	\N
9	1	\N	2026-05-25 18:15:44.100986	65000.00	facturado	[{"producto_id": 6, "nombre": "Ron Viejo de Caldas Media", "precio": 65000.0, "cantidad": 1}]	\N	individual	\N	\N
10	1	\N	2026-05-27 11:50:49.29301	12000.00	facturado	[{"producto_id": 3, "nombre": "Cerveza Corona Extra", "precio": 12000.0, "cantidad": 1}]	\N	individual	\N	\N
11	2	\N	2026-05-27 11:50:49.29301	65000.00	pendiente	[{"producto_id": 6, "nombre": "Ron Viejo de Caldas Media", "precio": 65000.0, "cantidad": 1}]	\N	individual	\N	\N
\.


--
-- Data for Name: pedido_linea; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pedido_linea (id, pedido_id, producto_id, nombre, precio, cantidad, mesa_origen_id, mesa_origen_numero, estado_linea, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.producto (id, nombre, precio, descripcion, categoria, precio_pequena, precio_mediana, precio_grande, precio_compra, precio_venta, stock, imagen_url, es_insumo, costo_unitario) FROM stdin;
3	Cerveza Corona Extra	12000.00	\N	Cerveza	12000	0	0	5000	12000	150	/static/uploads/producto_3_4488e1be.png	f	0
5	Margarita Classic	28000.00	\N	Coctel	28000	0	0	12000	28000	50	/static/uploads/producto_5_b1c8d46d.png	f	0
6	Ron Viejo de Caldas Media	65000.00	\N	Licores	65000	0	0	30000	65000	120	http://localhost:5000/static/uploads/producto_6_676d46e4.png	f	0
7	Mojito Cubano	26000.00	\N	Coctel	26000	0	0	13000	26000	50	/static/uploads/producto_7_cda57f93.png	f	0
2	Aguardiente Antioqueño Media	60000.00	\N	Licores	60000	0	0	27000	60000	120	http://localhost:5000/static/uploads/producto_2_2ba92a19.png	f	27000
4	Cerveza Club Colombia Dorada	8000.00	\N	Cerveza	8000	0	0	3500	8000	150	http://localhost:5000/static/uploads/producto_4_afdca0b7.png	f	3500
\.


--
-- Data for Name: recetas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recetas (id, pizza_id, insumo_id, tamano, cantidad_gastada) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, role) FROM stdin;
\.


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario (id, nombre, email, contrasena_hash, rol) FROM stdin;
2	Administrador	admin@seasonsclub.com	$2b$12$Bn4yUquxCP3LzKXNFNzSs.xbeBLQUIm4.yDzaJLmzQYYUi4OxM6lq	admin
4	Mesero_1	mesero@seasonsclub.com	$2b$12$bAtJFmFRGd6My/GyWYgp.eZjIcMyXrSCwxUNUTBXcKyIiP.4UPVe.	mesero
\.


--
-- Data for Name: venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venta (id, mesa_id, total_venta, metodo_pago, fecha) FROM stdin;
1	1	20000	Efectivo	2026-05-24 23:15:46.327963
2	2	60000	Transferencia	2026-05-24 23:45:40.39326
3	3	52000	Efectivo	2026-05-25 00:58:06.360717
4	2	60000	Efectivo	2026-05-25 02:54:14.635619
5	20	68000	Transferencia	2026-05-25 10:59:53.076853
6	1	12000	Efectivo	2026-05-25 17:26:03.02987
7	2	60000	Efectivo	2026-05-25 18:15:44.065318
8	1	72000	Efectivo	2026-05-25 18:15:44.065318
9	1	65000	Efectivo	2026-05-27 11:50:49.284618
10	1	12000	Efectivo	2026-05-27 11:50:49.284618
\.


--
-- Name: corte_caja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.corte_caja_id_seq', 2, true);


--
-- Name: grupo_mesa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grupo_mesa_id_seq', 1, false);


--
-- Name: historial_ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historial_ventas_id_seq', 10, true);


--
-- Name: insumos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insumos_id_seq', 1, false);


--
-- Name: mesa_grupo_miembro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mesa_grupo_miembro_id_seq', 1, false);


--
-- Name: mesas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mesas_id_seq', 20, true);


--
-- Name: pedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pedido_id_seq', 11, true);


--
-- Name: producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.producto_id_seq', 7, true);


--
-- Name: recetas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recetas_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_id_seq', 4, true);


--
-- Name: venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.venta_id_seq', 10, true);


--
-- Name: corte_caja corte_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corte_caja
    ADD CONSTRAINT corte_caja_pkey PRIMARY KEY (id);


--
-- Name: grupo_mesa grupo_mesa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo_mesa
    ADD CONSTRAINT grupo_mesa_pkey PRIMARY KEY (id);


--
-- Name: historial_ventas historial_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_ventas
    ADD CONSTRAINT historial_ventas_pkey PRIMARY KEY (id);


--
-- Name: insumos insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_pkey PRIMARY KEY (id);


--
-- Name: mesa_grupo_miembro mesa_grupo_miembro_grupo_mesa_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesa_grupo_miembro
    ADD CONSTRAINT mesa_grupo_miembro_grupo_mesa_uq UNIQUE (grupo_mesa_id, mesa_id);


--
-- Name: mesa_grupo_miembro mesa_grupo_miembro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesa_grupo_miembro
    ADD CONSTRAINT mesa_grupo_miembro_pkey PRIMARY KEY (id);


--
-- Name: mesas mesas_numero_mesa_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_numero_mesa_key UNIQUE (numero_mesa);


--
-- Name: mesas mesas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_pkey PRIMARY KEY (id);


--
-- Name: pedido_linea pedido_linea_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido_linea
    ADD CONSTRAINT pedido_linea_pkey PRIMARY KEY (id);


--
-- Name: pedido pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
    ADD CONSTRAINT pedido_pkey PRIMARY KEY (id);


--
-- Name: producto producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_pkey PRIMARY KEY (id);


--
-- Name: recetas recetas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- Name: venta venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_pkey PRIMARY KEY (id);


--
-- Name: idx_grupo_mesa_anfitriona; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grupo_mesa_anfitriona ON public.grupo_mesa USING btree (mesa_anfitriona_id);


--
-- Name: idx_grupo_mesa_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grupo_mesa_estado ON public.grupo_mesa USING btree (estado);


--
-- Name: idx_mesa_grupo_miembro_grupo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mesa_grupo_miembro_grupo ON public.mesa_grupo_miembro USING btree (grupo_mesa_id);


--
-- Name: idx_mesas_grupo_mesa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mesas_grupo_mesa ON public.mesas USING btree (grupo_mesa_id);


--
-- Name: idx_pedido_grupo_mesa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_grupo_mesa ON public.pedido USING btree (grupo_mesa_id);


--
-- Name: idx_pedido_linea_estado_activa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_linea_estado_activa ON public.pedido_linea USING btree (pedido_id, estado_linea) WHERE ((estado_linea)::text = 'activa'::text);


--
-- Name: idx_pedido_linea_mesa_origen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_linea_mesa_origen ON public.pedido_linea USING btree (mesa_origen_id);


--
-- Name: idx_pedido_linea_pedido; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_linea_pedido ON public.pedido_linea USING btree (pedido_id);


--
-- Name: idx_pedido_mesa_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_mesa_estado ON public.pedido USING btree (mesa_id, estado);


--
-- Name: idx_pedido_padre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_padre ON public.pedido USING btree (pedido_padre_id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: uq_mesa_grupo_miembro_mesa_activa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_mesa_grupo_miembro_mesa_activa ON public.mesa_grupo_miembro USING btree (mesa_id) WHERE (activo = true);


--
-- Name: grupo_mesa grupo_mesa_mesa_anfitriona_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo_mesa
    ADD CONSTRAINT grupo_mesa_mesa_anfitriona_fkey FOREIGN KEY (mesa_anfitriona_id) REFERENCES public.mesas(id);


--
-- Name: historial_ventas historial_ventas_mesa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_ventas
    ADD CONSTRAINT historial_ventas_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES public.mesas(id);


--
-- Name: mesa_grupo_miembro mesa_grupo_miembro_grupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesa_grupo_miembro
    ADD CONSTRAINT mesa_grupo_miembro_grupo_fkey FOREIGN KEY (grupo_mesa_id) REFERENCES public.grupo_mesa(id) ON DELETE CASCADE;


--
-- Name: mesa_grupo_miembro mesa_grupo_miembro_mesa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesa_grupo_miembro
    ADD CONSTRAINT mesa_grupo_miembro_mesa_fkey FOREIGN KEY (mesa_id) REFERENCES public.mesas(id);


--
-- Name: mesas mesas_grupo_mesa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_grupo_mesa_fkey FOREIGN KEY (grupo_mesa_id) REFERENCES public.grupo_mesa(id);


--
-- Name: pedido pedido_grupo_mesa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
    ADD CONSTRAINT pedido_grupo_mesa_fkey FOREIGN KEY (grupo_mesa_id) REFERENCES public.grupo_mesa(id);


--
-- Name: pedido_linea pedido_linea_mesa_origen_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido_linea
    ADD CONSTRAINT pedido_linea_mesa_origen_fkey FOREIGN KEY (mesa_origen_id) REFERENCES public.mesas(id);


--
-- Name: pedido_linea pedido_linea_pedido_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido_linea
    ADD CONSTRAINT pedido_linea_pedido_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedido(id) ON DELETE CASCADE;


--
-- Name: pedido_linea pedido_linea_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido_linea
    ADD CONSTRAINT pedido_linea_producto_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id);


--
-- Name: pedido pedido_mesa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
    ADD CONSTRAINT pedido_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES public.mesas(id);


--
-- Name: pedido pedido_pedido_padre_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
    ADD CONSTRAINT pedido_pedido_padre_fkey FOREIGN KEY (pedido_padre_id) REFERENCES public.pedido(id);


--
-- Name: recetas recetas_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: recetas recetas_pizza_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_pizza_id_fkey FOREIGN KEY (pizza_id) REFERENCES public.producto(id);


--
-- PostgreSQL database dump complete
--

\unrestrict UbCX4I2HxUkLVYiYPbjRTWzKuabGeZxs3tu1u4q8i7cNfoWNa2KmG3l8I6pVf0e

