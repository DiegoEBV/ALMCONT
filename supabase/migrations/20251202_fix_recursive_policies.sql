DROP POLICY IF EXISTS usuarios_self_read ON usuarios;
CREATE POLICY usuarios_self_read ON usuarios FOR SELECT USING (id = auth.uid() OR current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA'));

DROP POLICY IF EXISTS usuarios_admin_write ON usuarios;
CREATE POLICY usuarios_admin_write ON usuarios FOR ALL USING (current_user_role() = 'ADMIN') WITH CHECK (current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS obras_read_by_role ON obras;
CREATE POLICY obras_read_by_role ON obras FOR SELECT USING (current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA','ALMACENERO','PRODUCCION','RESIDENTE'));

DROP POLICY IF EXISTS materiales_read_by_role ON materiales;
CREATE POLICY materiales_read_by_role ON materiales FOR SELECT USING (current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA','ALMACENERO','PRODUCCION','RESIDENTE'));

DROP POLICY IF EXISTS req_select_role_or_obra ON requerimientos;
CREATE POLICY req_select_role_or_obra ON requerimientos FOR SELECT USING (current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id());

DROP POLICY IF EXISTS req_insert_produccion ON requerimientos;
CREATE POLICY req_insert_produccion ON requerimientos FOR INSERT WITH CHECK (current_user_role() IN ('PRODUCCION','COORDINACION'));

DROP POLICY IF EXISTS req_update_coord ON requerimientos;
CREATE POLICY req_update_coord ON requerimientos FOR UPDATE USING (current_user_role() IN ('COORDINACION','ADMIN'));

DROP POLICY IF EXISTS rq_items_select ON requerimiento_items;
CREATE POLICY rq_items_select ON requerimiento_items FOR SELECT USING (requerimiento_id IN (SELECT id FROM requerimientos WHERE current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id()));

DROP POLICY IF EXISTS rq_items_write_coord ON requerimiento_items;
CREATE POLICY rq_items_write_coord ON requerimiento_items FOR ALL USING (current_user_role() IN ('COORDINACION','ADMIN')) WITH CHECK (current_user_role() IN ('COORDINACION','ADMIN'));

DROP POLICY IF EXISTS sc_select_role_or_obra ON solicitudes_compra;
CREATE POLICY sc_select_role_or_obra ON solicitudes_compra FOR SELECT USING (current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id());

DROP POLICY IF EXISTS sc_insert_coord ON solicitudes_compra;
CREATE POLICY sc_insert_coord ON solicitudes_compra FOR INSERT WITH CHECK (current_user_role() = 'COORDINACION');

DROP POLICY IF EXISTS sc_update_coord ON solicitudes_compra;
CREATE POLICY sc_update_coord ON solicitudes_compra FOR UPDATE USING (current_user_role() = 'COORDINACION');

DROP POLICY IF EXISTS oc_select_role_or_obra ON ordenes_compra;
CREATE POLICY oc_select_role_or_obra ON ordenes_compra FOR SELECT USING (current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id());

DROP POLICY IF EXISTS oc_insert_log ON ordenes_compra;
CREATE POLICY oc_insert_log ON ordenes_compra FOR INSERT WITH CHECK (current_user_role() = 'LOGISTICA');

DROP POLICY IF EXISTS oc_update_log ON ordenes_compra;
CREATE POLICY oc_update_log ON ordenes_compra FOR UPDATE USING (current_user_role() = 'LOGISTICA');

DROP POLICY IF EXISTS entradas_select_role_or_obra ON entradas;
CREATE POLICY entradas_select_role_or_obra ON entradas FOR SELECT USING (current_user_role() IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id());

DROP POLICY IF EXISTS entradas_insert_alm ON entradas;
CREATE POLICY entradas_insert_alm ON entradas FOR INSERT WITH CHECK (current_user_role() = 'ALMACENERO');

DROP POLICY IF EXISTS entradas_update_alm ON entradas;
CREATE POLICY entradas_update_alm ON entradas FOR UPDATE USING (current_user_role() = 'ALMACENERO');

DROP POLICY IF EXISTS entrada_items_select ON entrada_items;
CREATE POLICY entrada_items_select ON entrada_items FOR SELECT USING (entrada_id IN (SELECT id FROM entradas WHERE current_user_role() IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id()));

DROP POLICY IF EXISTS entrada_items_insert_alm ON entrada_items;
CREATE POLICY entrada_items_insert_alm ON entrada_items FOR INSERT WITH CHECK (current_user_role() = 'ALMACENERO');

DROP POLICY IF EXISTS salidas_select_role_or_obra ON salidas;
CREATE POLICY salidas_select_role_or_obra ON salidas FOR SELECT USING (current_user_role() IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id());

DROP POLICY IF EXISTS salidas_insert_alm ON salidas;
CREATE POLICY salidas_insert_alm ON salidas FOR INSERT WITH CHECK (current_user_role() = 'ALMACENERO');

DROP POLICY IF EXISTS salidas_update_alm ON salidas;
CREATE POLICY salidas_update_alm ON salidas FOR UPDATE USING (current_user_role() = 'ALMACENERO');

DROP POLICY IF EXISTS salida_items_select ON salida_items;
CREATE POLICY salida_items_select ON salida_items FOR SELECT USING (salida_id IN (SELECT id FROM salidas WHERE current_user_role() IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id()));

DROP POLICY IF EXISTS salida_items_insert_alm ON salida_items;
CREATE POLICY salida_items_insert_alm ON salida_items FOR INSERT WITH CHECK (current_user_role() = 'ALMACENERO');

DROP POLICY IF EXISTS stock_select_role_or_obra ON stock_obra_material;
CREATE POLICY stock_select_role_or_obra ON stock_obra_material FOR SELECT USING (current_user_role() IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id());

DROP POLICY IF EXISTS stock_update_system ON stock_obra_material;
CREATE POLICY stock_update_system ON stock_obra_material FOR UPDATE USING (current_user_role() IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA'));

DROP POLICY IF EXISTS kardex_select_role_or_obra ON kardex_movimiento;
CREATE POLICY kardex_select_role_or_obra ON kardex_movimiento FOR SELECT USING (current_user_role() IN ('ADMIN','ALMACENERO','COORDINACION','LOGISTICA') OR obra_id = current_user_obra_id());

DROP POLICY IF EXISTS rq_sc_select ON rq_sc;
CREATE POLICY rq_sc_select ON rq_sc FOR SELECT USING (current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA'));

DROP POLICY IF EXISTS sc_oc_select ON sc_oc;
CREATE POLICY sc_oc_select ON sc_oc FOR SELECT USING (current_user_role() IN ('ADMIN','COORDINACION','LOGISTICA'));

COMMIT;
