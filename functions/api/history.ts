
export const onRequestGet = async (context) => {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database not bound", isCloud: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM articles ORDER BY created_at DESC LIMIT 50"
    ).all();

    const history = results.map(row => ({
      id: row.id,
      topic: row.topic,
      content: row.content,
      sources: JSON.parse(row.sources || '[]'),
      coverImage: row.cover_image,
      date: row.created_at,
      isCloud: true
    }));

    return new Response(JSON.stringify({ history, isCloud: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const onRequestDelete = async (context) => {
  const { request, env } = context;
  
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database not bound" }), { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id === "all") {
      await env.DB.prepare("DELETE FROM articles").run();
    } else if (id) {
      await env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
    } else {
      return new Response(JSON.stringify({ error: "Missing id parameter" }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
