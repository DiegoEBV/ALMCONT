import{s as t,l,m,a as y}from"./index-DGXBGZuQ.js";import{N as w}from"./numberGenerator-C0I-bWRm.js";async function i(){const o=l.getCurrentUser();if(o)if(o.supabaseId)console.log("Usando supabaseId directamente:",o.supabaseId),await t.rpc("set_user_context",{user_id:o.supabaseId,user_role:o.rol});else{const r=await m(o.id,"usuario");r?await t.rpc("set_user_context",{user_id:r,user_role:o.rol}):console.warn("No se pudo mapear el usuario local a UUID de Supabase:",o.id)}}const E={async getAll(){try{await i();const{data:o,error:r}=await t.from("solicitudes_compra").select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).order("created_at",{ascending:!1});if(r)throw r;return o||[]}catch(o){throw console.error("Error fetching solicitudes compra:",o),new Error("Error al obtener solicitudes de compra")}},async getById(o){try{await i();const{data:r,error:e}=await t.from("solicitudes_compra").select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).eq("id",o).single();if(e)throw e;return r}catch(r){return console.error("Error al obtener solicitud de compra:",r),null}},async getByObra(o){try{await i();const{data:r,error:e}=await t.from("solicitudes_compra").select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).eq("obra_id",o).order("created_at",{ascending:!1});if(e)throw e;return r||[]}catch(r){return console.error("Error al obtener solicitudes por obra:",r),[]}},async searchByNumeroSC(o){try{await i(),console.log("Buscando SC:",o);const{data:r,error:e}=await t.from("requerimientos").select("*").eq("numero_solicitud_compra",o);if(e)throw console.error("Error al buscar requerimientos:",e),e;if(!r||r.length===0)throw console.log("No se encontraron requerimientos para SC:",o),new Error("No se encontró la solicitud de compra");console.log("Requerimientos encontrados:",r.length);const a=r.map(s=>s.material_id).filter(s=>s);let c=[];if(a.length>0){const{data:s,error:n}=await t.from("materiales").select("*").in("id",a);n||(c=s||[])}const d=r.map(s=>s.obra_id).filter(s=>s);let u=[];if(d.length>0){const{data:s,error:n}=await t.from("obras").select("*").in("id",d);n||(u=s||[])}const b=r.map(s=>({...s,material:c.find(n=>n.id===s.material_id)||null,obra:u.find(n=>n.id===s.obra_id)||null})),{data:f,error:_}=await t.from("solicitudes_compra").select("*").eq("numero_sc",o).single();_&&console.warn("No se encontró solicitud de compra:",_.message);const p=f||{id:`temp-${o}`,numero_sc:o,estado:"PENDIENTE",fecha_solicitud:new Date().toISOString(),obra:null,created_by_user:null,aprobado_por_user:null};return console.log("Solicitud base:",p),[{...p,requerimientos:b}]}catch(r){throw console.error("Error al buscar solicitud por número SC:",r),r}},async getByProveedor(o){try{await i();const{data:r,error:e}=await t.from("solicitudes_compra").select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).ilike("proveedor",`%${o}%`).order("created_at",{ascending:!1});if(e)throw e;return r||[]}catch(r){return console.error("Error al obtener solicitudes por proveedor:",r),[]}},async getByEstado(o){try{await i();const{data:r,error:e}=await t.from("solicitudes_compra").select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).eq("estado",o).order("created_at",{ascending:!1});if(e)throw e;return r||[]}catch(r){return console.error("Error al obtener solicitudes por estado:",r),[]}},async create(o){try{const r=l.getCurrentUser();if(!r||r.rol!=="COORDINACION")throw new Error("No tienes permisos para crear solicitudes de compra");const e=await m(r.id,"usuario");if(!e)throw new Error("No se pudo mapear el usuario a UUID de Supabase");await y(e);const a=o.numero_sc||await w.generateUniqueNumber("SC"),c={...o,numero_sc:a,estado:"PENDIENTE",created_by:e,created_at:new Date().toISOString(),updated_at:new Date().toISOString()},{data:d,error:u}=await t.from("solicitudes_compra").insert(c).select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).single();if(u)throw u;return d}catch(r){throw console.error("Error al crear solicitud de compra:",r),r}},async update(o,r){try{const e=l.getCurrentUser();if(!e||e.rol!=="COORDINACION")throw new Error("No tienes permisos para actualizar solicitudes de compra");await i();const{data:a,error:c}=await t.from("solicitudes_compra").update({...r,updated_at:new Date().toISOString()}).eq("id",o).select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).single();if(c)throw c;return a}catch(e){throw console.error("Error al actualizar solicitud de compra:",e),e}},async asignar(o,r){try{await i();const{data:e,error:a}=await t.from("solicitudes_compra").update({asignado_a:r,estado:"ASIGNADA",updated_at:new Date().toISOString()}).eq("id",o).select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).single();if(a)throw a;return e}catch(e){return console.error("Error al asignar solicitud de compra:",e),null}},async updateEstado(o,r){try{await i();const{data:e,error:a}=await t.from("solicitudes_compra").update({estado:r,updated_at:new Date().toISOString()}).eq("id",o).select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `).single();if(a)throw a;return e}catch(e){return console.error("Error al actualizar estado de solicitud:",e),null}},async delete(o){try{const r=l.getCurrentUser();if(!r||r.rol!=="COORDINACION")throw new Error("No tienes permisos para eliminar solicitudes de compra");await i();const{error:e}=await t.from("solicitudes_compra").delete().eq("id",o);if(e)throw e;return!0}catch(r){throw console.error("Error al eliminar solicitud de compra:",r),r}},async checkNumeroSCExists(o,r){try{await i();let e=t.from("solicitudes_compra").select("id").eq("numero_sc",o);r&&(e=e.neq("id",r));const{data:a,error:c}=await e;if(c)throw c;return((a==null?void 0:a.length)||0)>0}catch(e){return console.error("Error al verificar número SC:",e),!1}}},S={async asociarRequerimientos(o,r){try{await i();const e=r.map(c=>({sc_id:o,rq_id:c,created_at:new Date().toISOString()})),{error:a}=await t.from("rq_sc").insert(e);if(a)throw a;return!0}catch(e){return console.error("Error al asociar requerimientos:",e),!1}},async getRequerimientosBySC(o){try{await i();const{data:r,error:e}=await t.from("rq_sc").select(`
          requerimientos!inner(
            *,
            obra:obras(*),
            material:materiales(*)
          )
        `).eq("sc_id",o);if(e)throw e;const a=(r==null?void 0:r.map(c=>c.requerimientos).filter(Boolean))||[];return console.log("Requerimientos obtenidos para SC:",o,a),a}catch(r){return console.error("Error al obtener requerimientos por SC:",r),[]}},async getSCsByRequerimiento(o){try{await i();const{data:r,error:e}=await t.from("rq_sc").select(`
          sc_id,
          solicitud_compra:solicitudes_compra(
            *,
            obra:obras(*),
            created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
            aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
          )
        `).eq("rq_id",o);if(e)throw e;return(r==null?void 0:r.map(a=>a.solicitud_compra).filter(Boolean))||[]}catch(r){return console.error("Error al obtener SCs por requerimiento:",r),[]}},async desasociarRequerimiento(o,r){try{await i();const{error:e}=await t.from("rq_sc").delete().eq("sc_id",o).eq("rq_id",r);if(e)throw e;return!0}catch(e){return console.error("Error al desasociar requerimiento:",e),!1}}};export{S as R,E as s};
