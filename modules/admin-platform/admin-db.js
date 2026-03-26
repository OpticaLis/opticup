// === admin-db.js ===
// Lightweight DB wrapper for admin operations (no tenant_id injection)
// Depends on: adminSb from admin-auth.js

const AdminDB = {

  async query(table, select = '*', filters = {}) {
    let query = adminSb.from(table).select(select);

    for (const [key, value] of Object.entries(filters)) {
      if (key === '_order') {
        query = query.order(value.column, { ascending: value.ascending });
      } else if (key === '_limit') {
        query = query.limit(value);
      } else if (key === '_range') {
        query = query.range(value[0], value[1]);
      } else {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  async getById(table, id) {
    const { data, error } = await adminSb
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async insert(table, data) {
    const { data: row, error } = await adminSb
      .from(table)
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async update(table, id, data) {
    const { data: row, error } = await adminSb
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async rpc(name, params = {}) {
    const { data, error } = await adminSb.rpc(name, params);
    if (error) throw new Error(error.message);
    return data;
  }
};
