const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/stockAlerts-DNTeaATg.js","assets/index-DGXBGZuQ.js","assets/index-VimOGhGs.css"])))=>i.map(i=>d[i]);
import{r as u,A as m,s as i,_,l as g,m as w,a as h}from"./index-DGXBGZuQ.js";function f(){const e=u.useContext(m);if(!e)throw new Error("useAuth debe ser usado dentro de un AuthProvider");return e}async function d(){const e=g.getCurrentUser();if(e){const t=await w(e.id,"usuario");t?await h(t):console.warn("No se pudo mapear el usuario local a UUID de Supabase:",e.id)}}const p={async getAll(){try{console.log("🔄 Iniciando carga de requerimientos de materiales"),await d();const{data:e,error:t}=await i.from("requerimiento_materiales").select(`
          *,
          obra:obras(*),
          solicitante:usuarios!requerimiento_materiales_solicitante_id_fkey(*),
          aprobado_por_user:usuarios!requerimiento_materiales_aprobado_por_fkey(*),
          detalles:detalle_requerimiento(
            *,
            material:materiales(*)
          )
        `).order("created_at",{ascending:!1});if(t)throw console.error("❌ Error de Supabase al obtener requerimientos:",t),t;return console.log("📋 Requerimientos obtenidos:",(e==null?void 0:e.length)||0),e||[]}catch(e){return console.error("❌ Error en getAll requerimientos:",e),[]}},async getByUsuario(e){try{const{data:t,error:r}=await i.from("requerimiento_materiales").select(`
          *,
          obra:obras(*),
          solicitante:usuarios!requerimiento_materiales_solicitante_id_fkey(*),
          aprobado_por_user:usuarios!requerimiento_materiales_aprobado_por_fkey(*),
          detalles:detalle_requerimiento(
            *,
            material:materiales(*)
          )
        `).eq("solicitante_id",e).order("created_at",{ascending:!1});if(r)throw r;return t||[]}catch(t){return console.error("Error fetching requerimientos by usuario:",t),[]}},async getById(e){try{await d();const{data:t,error:r}=await i.from("requerimiento_materiales").select(`
          *,
          obra:obras(*),
          solicitante:usuarios!requerimiento_materiales_solicitante_id_fkey(*),
          aprobado_por_user:usuarios!requerimiento_materiales_aprobado_por_fkey(*),
          detalles:detalle_requerimiento(
            *,
            material:materiales(*)
          )
        `).eq("id",e).single();if(r){if(r.code==="PGRST116")return null;throw r}return t}catch(t){return console.error("Error fetching requerimiento:",t),null}},async create(e,t){try{if(await d(),e.detalles&&e.detalles.length>0){const{stockAlertsService:o}=await _(async()=>{const{stockAlertsService:s}=await import("./stockAlerts-DNTeaATg.js");return{stockAlertsService:s}},__vite__mapDeps([0,1,2]));for(const s of e.detalles){const n=await o.wouldExceedMaxStock(s.material_id,s.cantidad);if(n.wouldExceed){const{data:l}=await i.from("materiales").select("nombre, codigo").eq("id",s.material_id).single();throw new Error(`El material "${(l==null?void 0:l.nombre)||"desconocido"}" (${(l==null?void 0:l.codigo)||""}) excedería su stock máximo: ${n.newUsage}/${n.maxStock} (${n.usagePercentage.toFixed(1)}%)`)}}}const r=await this.generateNumeroRequerimiento(),{data:a,error:c}=await i.from("requerimiento_materiales").insert({codigo:r,obra_id:e.obra_id,solicitante_id:t,fecha_solicitud:new Date().toISOString(),fecha_requerida:e.fecha_necesidad,estado:"PENDIENTE",prioridad:e.prioridad||"MEDIA",comentarios:e.observaciones,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}).select().single();if(c)throw c;if(e.detalles&&e.detalles.length>0){const o=e.detalles.map(n=>({requerimiento_id:a.id,material_id:n.material_id,cantidad:n.cantidad,comentarios:n.comentarios,created_at:new Date().toISOString(),updated_at:new Date().toISOString()})),{error:s}=await i.from("detalle_requerimiento").insert(o);if(s)throw s}return await this.getById(a.id)}catch(r){throw console.error("Error creating requerimiento:",r),r}},async updateEstado(e,t){try{const{data:r,error:a}=await i.from("requerimiento_materiales").update({estado:t,updated_at:new Date().toISOString()}).eq("id",e).select().single();if(a)throw a;return r}catch(r){throw console.error("Error updating requerimiento estado:",r),new Error("Error al actualizar estado del requerimiento")}},async generateNumeroRequerimiento(){try{const{count:e,error:t}=await i.from("requerimiento_materiales").select("*",{count:"exact",head:!0});if(t)throw t;const r=(e||0)+1;return`RM-${new Date().getFullYear()}-${r.toString().padStart(4,"0")}`}catch(e){return console.error("Error generating codigo requerimiento:",e),`RM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`}},async getEstadisticas(e){try{let t=i.from("requerimiento_materiales").select("estado");e&&(t=t.eq("solicitante_id",e));const{data:r,error:a}=await t;if(a)throw a;return{total:(r==null?void 0:r.length)||0,pendientes:(r==null?void 0:r.filter(o=>o.estado==="PENDIENTE").length)||0,enRevision:(r==null?void 0:r.filter(o=>o.estado==="EN_REVISION").length)||0,aprobados:(r==null?void 0:r.filter(o=>o.estado==="APROBADO").length)||0,rechazados:(r==null?void 0:r.filter(o=>o.estado==="RECHAZADO").length)||0,atendidos:(r==null?void 0:r.filter(o=>o.estado==="ATENDIDO").length)||0}}catch(t){return console.error("Error getting estadisticas:",t),{total:0,pendientes:0,enRevision:0,aprobados:0,rechazados:0,atendidos:0}}}};export{p as r,f as u};
