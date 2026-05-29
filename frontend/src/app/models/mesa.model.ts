/**
 * Modelos de mesas, consumo y unión de grupos — Seasons Club POS.
 * Contrato alineado con GET /consumo y POST /mesas/unir (Fase B.1).
 */

/** Mesa física del mapa (GET /api/mesas). */
export interface Mesa {
  id: number;
  numero_mesa: number;
  estado: 'LIBRE' | 'OCUPADA' | string;
  grupo_mesa_id?: number | null;
}

/** Línea de comanda tal como la expone el backend (articulos_json / PedidoLinea). */
export interface ArticuloLineaMesa {
  linea_id?: string;
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  mesa_origen_id?: number | null;
  mesa_origen_numero?: number | null;
}

/** Pedido abierto o consolidado de una mesa. */
export interface PedidoConsumoMesa {
  id?: number;
  mesa_id?: number;
  total: number;
  estado?: string;
  tipo?: 'individual' | 'maestra' | 'subcuenta' | string;
  grupo_mesa_id?: number | null;
  articulos: ArticuloLineaMesa[];
}

/** Metadatos de grupo activo (GET /consumo). */
export interface ConsumoGrupoMeta {
  grupo_mesa_id: number | null;
  mesa_anfitriona_id: number | null;
  mesas_del_grupo: number[];
  numeros_mesas_grupo: number[];
  es_grupo_activo: boolean;
}

/** Respuesta completa de GET /api/mesas/:id/consumo. */
export interface RespuestaConsumoMesa extends ConsumoGrupoMeta {
  mesa_id: number;
  tiene_consumo: boolean;
  pedido: PedidoConsumoMesa;
}

/** Payload para agregar producto a una comanda. */
export interface PayloadProductoMesa {
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad?: number;
}

/** Grupo de mesas unidas (POST /mesas/unir). */
export interface GrupoMesaDto {
  id: number;
  mesa_anfitriona_id: number;
  estado: string;
  created_at?: string | null;
  closed_at?: string | null;
}

/** Body de POST /api/mesas/unir. */
export interface PayloadUnirMesas {
  mesa_ids: number[];
  mesa_anfitriona_id: number;
}

/** Respuesta de POST /api/mesas/unir. */
export interface RespuestaUnirMesas {
  status: 'success' | 'error';
  message: string;
  grupo_mesa: GrupoMesaDto;
  mesa_anfitriona_id: number;
  mesa_ids: number[];
  numeros_mesas: number[];
  pedido_maestro_id: number;
  pedidos_fusionados: number[];
  lineas_movidas: number;
  pedido: PedidoConsumoMesa;
}

/** Metadatos de grupo vacíos (mesa individual). */
export const CONSUMO_GRUPO_VACIO: ConsumoGrupoMeta = {
  grupo_mesa_id: null,
  mesa_anfitriona_id: null,
  mesas_del_grupo: [],
  numeros_mesas_grupo: [],
  es_grupo_activo: false,
};

/** Consumo vacío por defecto (fallback local / mesa sin comanda). */
export function crearConsumoVacio(mesaId: number): RespuestaConsumoMesa {
  return {
    mesa_id: mesaId,
    tiene_consumo: false,
    pedido: { total: 0, articulos: [] },
    ...CONSUMO_GRUPO_VACIO,
  };
}
