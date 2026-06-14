import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, writeFileSync, existsSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { createHmac, randomUUID } from "node:crypto";

const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

let privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
if (!privateKey) {
  try {
    const frontendEnvPath = join(process.cwd(), "..", "frontend", ".env");
    const content = readFileSync(frontendEnvPath, "utf-8");
    const match = content.match(/VITE_IMAGEKIT_PRIVATE_KEY=(.*)/);
    if (match) {
      privateKey = match[1].trim();
    }
  } catch (e) {
    try {
      const frontendEnvPath = join(process.cwd(), "frontend", ".env");
      const content = readFileSync(frontendEnvPath, "utf-8");
      const match = content.match(/VITE_IMAGEKIT_PRIVATE_KEY=(.*)/);
      if (match) {
        privateKey = match[1].trim();
      }
    } catch (e2) {
      console.warn("Could not load ImageKit private key from frontend/.env", e2);
    }
  }
}

const json = (response: ServerResponse, statusCode: number, body: unknown) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": frontendOrigin,
    "Access-Control-Allow-Credentials": "true",
  });
  response.end(JSON.stringify(body));
};

const readBody = async (request: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

interface DB {
  subjects: any[];
  topics: any[];
  sub_topics: any[];
  tests: any[];
  questions: any[];
}

const dbPath = join(process.cwd(), "src", "db.json");

let db: DB;
try {
  db = JSON.parse(readFileSync(dbPath, "utf-8"));
} catch (e) {
  console.error("Error reading db.json, initializing empty state", e);
  db = { subjects: [], topics: [], sub_topics: [], tests: [], questions: [] };
}

const normalizeText = (text: string): string => {
  if (!text) return "";
  return text.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, " ").trim().toLowerCase();
};

// Deduplicate existing questions on startup
const seenNormalized = new Set<string>();
const uniqueQuestions: any[] = [];
if (db && Array.isArray(db.questions)) {
  db.questions.forEach((q) => {
    const normalized = normalizeText(q.question);
    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      uniqueQuestions.push(q);
    } else {
      const firstUnique = uniqueQuestions.find(uq => normalizeText(uq.question) === normalized);
      if (firstUnique && Array.isArray(db.tests)) {
        db.tests.forEach((t: any) => {
          if (t.questions && t.questions.includes(q.id)) {
            t.questions = t.questions.map((qid: string) => qid === q.id ? firstUnique.id : qid);
            t.questions = Array.from(new Set(t.questions));
          }
        });
      }
    }
  });
  db.questions = uniqueQuestions;
}

const saveDb = () => {
  try {
    writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving db.json", e);
  }
};

let distPath = join(process.cwd(), "..", "frontend", "dist");
if (!existsSync(distPath)) {
  distPath = join(process.cwd(), "frontend", "dist");
}

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";

  if (method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": frontendOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    });
    response.end();
    return;
  }

  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const path = requestUrl.pathname;

  if (path === "/" || path === "/api") {
    json(response, 200, {
      success: true,
      message: "PrepRoute API is running successfully!",
      health: "/api/health"
    });
    return;
  }

  if (path === "/api/health") {
    json(response, 200, { success: true, service: "preproute-backend" });
    return;
  }

  // POST /api/auth/login
  if (path === "/api/auth/login" && method === "POST") {
    try {
      const body = JSON.parse(await readBody(request));
      json(response, 200, {
        success: true,
        data: {
          token: "mock-jwt-token-xyz-12345",
          user: {
            id: "usr-admin",
            name: body.userId || "Alex Wando",
            userId: body.userId || "admin",
            role: "Admin",
            email: "admin@preproute.com"
          }
        }
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // GET /api/imagekit/auth
  if (path === "/api/imagekit/auth" && method === "GET") {
    if (!privateKey) {
      json(response, 500, { success: false, message: "ImageKit private key not configured on backend" });
      return;
    }
    const token = randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    const signature = createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    json(response, 200, {
      signature,
      token,
      expire
    });
    return;
  }

  // GET /api/subjects
  if (path === "/api/subjects" && method === "GET") {
    json(response, 200, {
      success: true,
      data: db.subjects
    });
    return;
  }

  // GET /api/topics/subject/:subjectId
  if (path.startsWith("/api/topics/subject/") && method === "GET") {
    const subjectId = path.replace("/api/topics/subject/", "");
    const topics = db.topics.filter(t => t.subject_id === subjectId);
    json(response, 200, {
      success: true,
      data: topics
    });
    return;
  }

  // GET /api/topics
  if (path === "/api/topics" && method === "GET") {
    json(response, 200, {
      success: true,
      data: db.topics
    });
    return;
  }

  // GET /api/sub-topics
  if (path === "/api/sub-topics" && method === "GET") {
    json(response, 200, {
      success: true,
      data: db.sub_topics
    });
    return;
  }

  // POST /api/sub-topics/multi-topics
  if (path === "/api/sub-topics/multi-topics" && method === "POST") {
    try {
      const { topicIds } = JSON.parse(await readBody(request));
      const subTopics = db.sub_topics.filter(st => topicIds.includes(st.topic_id));
      json(response, 200, {
        success: true,
        data: subTopics
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // GET /api/tests
  if (path === "/api/tests" && method === "GET") {
    json(response, 200, {
      success: true,
      data: db.tests
    });
    return;
  }

  // GET /api/tests/:id
  if (path.startsWith("/api/tests/") && !path.endsWith("/edit") && !path.endsWith("/questions") && !path.endsWith("/preview") && method === "GET") {
    const id = path.replace("/api/tests/", "");
    const test = db.tests.find(t => t.id === id);
    if (test) {
      json(response, 200, {
        success: true,
        data: test
      });
    } else {
      json(response, 404, { success: false, message: "Test not found" });
    }
    return;
  }

  // POST /api/tests
  if (path === "/api/tests" && method === "POST") {
    try {
      const payload = JSON.parse(await readBody(request));
      const newTest = {
        id: `test-${Date.now()}`,
        ...payload,
        questions: payload.questions || [],
        created_at: new Date().toISOString()
      };
      db.tests.push(newTest);
      saveDb();
      json(response, 201, {
        success: true,
        data: newTest
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // PUT /api/tests/:id
  if (path.startsWith("/api/tests/") && method === "PUT") {
    try {
      const id = path.replace("/api/tests/", "");
      const index = db.tests.findIndex(t => t.id === id);
      if (index !== -1) {
        const payload = JSON.parse(await readBody(request));
        db.tests[index] = {
          ...db.tests[index],
          ...payload
        };
        saveDb();
        json(response, 200, {
          success: true,
          data: db.tests[index]
        });
      } else {
        json(response, 404, { success: false, message: "Test not found" });
      }
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // DELETE /api/tests/:id
  if (path.startsWith("/api/tests/") && method === "DELETE") {
    const id = path.replace("/api/tests/", "");
    const index = db.tests.findIndex(t => t.id === id);
    if (index !== -1) {
      db.tests.splice(index, 1);
      saveDb();
      json(response, 200, {
        success: true,
        message: "Test deleted successfully"
      });
    } else {
      json(response, 404, { success: false, message: "Test not found" });
    }
    return;
  }

  // GET /api/questions
  if (path === "/api/questions" && method === "GET") {
    const query = requestUrl.searchParams;
    const searchText = query.get("question")?.toLowerCase() || "";
    const difficulty = query.get("difficulty") || "";
    const topicId = query.get("topic_id") || "";
    const subTopicId = query.get("sub_topic_id") || "";
    const subjectId = query.get("subject_id") || "";
    const createdBy = query.get("created_by") || "";
    const startDate = query.get("start_date") || "";
    const endDate = query.get("end_date") || "";
    const page = Number(query.get("page") || 1);
    const limit = Number(query.get("limit") || 10);

    const mapWithUsage = (q: any) => {
      const testsUsingQ = db.tests.filter(t => t.questions && t.questions.includes(q.id));
      const hasLiveTest = testsUsingQ.some(t => t.status === "live");
      const hasDraftTest = testsUsingQ.some(t => t.status === "draft");
      return {
        ...q,
        used_in_tests: testsUsingQ.map(t => t.id),
        usage_count: testsUsingQ.length,
        is_published: hasLiveTest,
        is_draft: hasDraftTest
      };
    };

    let filtered = db.questions.map(mapWithUsage);

    // Sort by created_at descending (newest first)
    filtered.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(q => q.question?.toLowerCase().includes(searchText));
    }

    // Filter by difficulty
    if (difficulty) {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }

    // Filter by topic
    if (topicId) {
      filtered = filtered.filter(q => q.topic_id === topicId);
    }

    // Filter by subtopic
    if (subTopicId) {
      filtered = filtered.filter(q => q.sub_topic_id === subTopicId);
    }

    // Filter by subject
    if (subjectId) {
      const subjectTopicIds = db.topics.filter(t => t.subject_id === subjectId).map(t => t.id);
      filtered = filtered.filter(q => q.topic_id && subjectTopicIds.includes(q.topic_id));
    }

    // Filter by created_by
    if (createdBy) {
      filtered = filtered.filter(q => q.created_by?.toLowerCase() === createdBy.toLowerCase());
    }

    // Filter by date range (created_at)
    if (startDate) {
      filtered = filtered.filter(q => q.created_at && q.created_at >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(q => q.created_at && q.created_at <= endDate);
    }

    // Calculate counts
    const total = filtered.length;

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    json(response, 200, {
      success: true,
      data: {
        data: paginated,
        total,
        page,
        limit
      }
    });
    return;
  }

  // GET /api/questions/:id/usage
  if (path.startsWith("/api/questions/") && path.endsWith("/usage") && method === "GET") {
    const id = path.replace("/api/questions/", "").replace("/usage", "");
    const tests = db.tests
      .filter(t => t.questions && t.questions.includes(id))
      .map(t => ({ id: t.id, name: t.name }));
    json(response, 200, {
      success: true,
      data: { tests }
    });
    return;
  }

  const isBulkQuestionRoute = path === "/api/questions/bulk" ||
                              path === "/api/questions/fetchBulk" ||
                              path === "/api/questions/bulk-delete" ||
                              path === "/api/questions/bulk-assign-topic" ||
                              path === "/api/questions/bulk-assign-difficulty" ||
                              path === "/api/questions/bulk-create";

  // GET /api/questions/:id
  if (path.startsWith("/api/questions/") && !path.endsWith("/usage") && !isBulkQuestionRoute && method === "GET") {
    const id = path.replace("/api/questions/", "");
    const question = db.questions.find(q => q.id === id);
    if (question) {
      json(response, 200, {
        success: true,
        data: question
      });
    } else {
      json(response, 404, { success: false, message: "Question not found" });
    }
    return;
  }

  // POST /api/questions/bulk-delete
  if (path === "/api/questions/bulk-delete" && method === "POST") {
    try {
      const { ids } = JSON.parse(await readBody(request));
      if (!Array.isArray(ids)) {
        json(response, 400, { success: false, message: "ids must be an array" });
        return;
      }

      db.questions = db.questions.filter(q => !ids.includes(q.id));

      db.tests.forEach((t: any) => {
        if (t.questions) {
          t.questions = t.questions.filter((qid: string) => !ids.includes(qid));
        }
      });

      saveDb();
      json(response, 200, { success: true, message: "Questions deleted successfully" });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // POST /api/questions/bulk-assign-topic
  if (path === "/api/questions/bulk-assign-topic" && method === "POST") {
    try {
      const { ids, topic_id, sub_topic_id } = JSON.parse(await readBody(request));
      if (!Array.isArray(ids)) {
        json(response, 400, { success: false, message: "ids must be an array" });
        return;
      }

      db.questions = db.questions.map(q => {
        if (ids.includes(q.id)) {
          return {
            ...q,
            topic_id,
            sub_topic_id: sub_topic_id || undefined,
            updated_at: new Date().toISOString(),
            updated_by: "Alex Wando"
          };
        }
        return q;
      });

      saveDb();
      json(response, 200, { success: true, message: "Topic assigned successfully" });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // POST /api/questions/bulk-assign-difficulty
  if (path === "/api/questions/bulk-assign-difficulty" && method === "POST") {
    try {
      const { ids, difficulty } = JSON.parse(await readBody(request));
      if (!Array.isArray(ids)) {
        json(response, 400, { success: false, message: "ids must be an array" });
        return;
      }

      db.questions = db.questions.map(q => {
        if (ids.includes(q.id)) {
          return {
            ...q,
            difficulty,
            updated_at: new Date().toISOString(),
            updated_by: "Alex Wando"
          };
        }
        return q;
      });

      saveDb();
      json(response, 200, { success: true, message: "Difficulty assigned successfully" });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // POST /api/questions/bulk-create
  if (path === "/api/questions/bulk-create" && method === "POST") {
    try {
      const body = JSON.parse(await readBody(request));
      const questions = Array.isArray(body) ? body : (body.questions || []);

      if (!Array.isArray(questions)) {
        json(response, 400, { success: false, message: "questions must be an array" });
        return;
      }

      const savedQuestions: any[] = [];
      const timestamp = Date.now();
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        let subjectId = "";
        let topicId = "";
        let subTopicId = "";

        const subjectStr = q.subject?.trim();
        const topicStr = q.topic?.trim();
        const subtopicStr = q.subtopic?.trim();

        // 1. Resolve Subject
        if (subjectStr) {
          const matchedSubject = db.subjects.find(
            (s) => s.name.toLowerCase() === subjectStr.toLowerCase()
          );
          if (matchedSubject) {
            subjectId = matchedSubject.id;
          } else {
            subjectId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            db.subjects.push({ id: subjectId, name: subjectStr });
          }
        }

        // 2. Resolve Topic
        if (topicStr) {
          let matchedTopic = null;
          if (subjectId) {
            matchedTopic = db.topics.find(
              (t) => t.name.toLowerCase() === topicStr.toLowerCase() && t.subject_id === subjectId
            );
          } else {
            matchedTopic = db.topics.find(
              (t) => t.name.toLowerCase() === topicStr.toLowerCase()
            );
            if (matchedTopic) {
              subjectId = matchedTopic.subject_id;
            }
          }

          if (matchedTopic) {
            topicId = matchedTopic.id;
          } else {
            if (!subjectId) {
              const generalSubject = db.subjects.find(
                (s) => s.name.toLowerCase() === "general"
              );
              if (generalSubject) {
                subjectId = generalSubject.id;
              } else {
                subjectId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                db.subjects.push({ id: subjectId, name: "General" });
              }
            }
            topicId = `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            db.topics.push({ id: topicId, name: topicStr, subject_id: subjectId });
          }
        }

        // 3. Resolve Subtopic
        if (subtopicStr) {
          let matchedSubTopic = null;
          if (topicId) {
            matchedSubTopic = db.sub_topics.find(
              (st) => st.name.toLowerCase() === subtopicStr.toLowerCase() && st.topic_id === topicId
            );
          } else {
            matchedSubTopic = db.sub_topics.find(
              (st) => st.name.toLowerCase() === subtopicStr.toLowerCase()
            );
            if (matchedSubTopic) {
              topicId = matchedSubTopic.topic_id;
              const parentTopic = db.topics.find((t) => t.id === topicId);
              if (parentTopic) {
                subjectId = parentTopic.subject_id;
              }
            }
          }

          if (matchedSubTopic) {
            subTopicId = matchedSubTopic.id;
          } else {
            if (!topicId) {
              if (!subjectId) {
                const generalSubject = db.subjects.find(
                  (s) => s.name.toLowerCase() === "general"
                );
                if (generalSubject) {
                  subjectId = generalSubject.id;
                } else {
                  subjectId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  db.subjects.push({ id: subjectId, name: "General" });
                }
              }

              const generalTopic = db.topics.find(
                (t) => t.name.toLowerCase() === "general" && t.subject_id === subjectId
              );
              if (generalTopic) {
                topicId = generalTopic.id;
              } else {
                topicId = `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                db.topics.push({ id: topicId, name: "General", subject_id: subjectId });
              }
            }
            subTopicId = `subtopic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            db.sub_topics.push({ id: subTopicId, name: subtopicStr, topic_id: topicId });
          }
        }

        if (topicId) {
          q.topic_id = topicId;
        }
        if (subTopicId) {
          q.sub_topic_id = subTopicId;
        }

        delete q.subject;
        delete q.topic;
        delete q.subtopic;

        const norm = normalizeText(q.question);
        const existingIdx = db.questions.findIndex(eq => normalizeText(eq.question) === norm);
        const tempIdx = savedQuestions.findIndex(eq => normalizeText(eq.question) === norm);

        const questionPayload = {
          created_by: "Alex Wando",
          created_at: new Date().toISOString(),
          status: "active",
          test_id: "",
          ...q
        };

        if (existingIdx !== -1) {
          db.questions[existingIdx] = {
            ...db.questions[existingIdx],
            ...questionPayload,
            id: db.questions[existingIdx].id,
            updated_at: new Date().toISOString()
          };
          savedQuestions.push(db.questions[existingIdx]);
        } else if (tempIdx !== -1) {
          savedQuestions[tempIdx] = {
            ...savedQuestions[tempIdx],
            ...questionPayload,
            updated_at: new Date().toISOString()
          };
        } else {
          const qId = q.id || `q-bank-${timestamp}-${i}`;
          const newQuestion = {
            ...questionPayload,
            id: qId
          };
          db.questions.push(newQuestion);
          savedQuestions.push(newQuestion);
        }
      }

      saveDb();
      json(response, 200, {
        success: true,
        data: {
          data: savedQuestions
        }
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // POST /api/questions
  if (path === "/api/questions" && method === "POST") {
    try {
      const payload = JSON.parse(await readBody(request));
      const norm = normalizeText(payload.question);
      const existingIdx = db.questions.findIndex(eq => normalizeText(eq.question) === norm);

      if (existingIdx !== -1) {
        db.questions[existingIdx] = {
          ...db.questions[existingIdx],
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by: "Alex Wando",
          status: "active"
        };
        saveDb();
        json(response, 200, {
          success: true,
          data: db.questions[existingIdx]
        });
        return;
      }

      const newQuestion = {
        id: payload.id || `q-bank-${Date.now()}`,
        created_by: "Alex Wando",
        created_at: new Date().toISOString(),
        status: "active",
        ...payload
      };

      db.questions.push(newQuestion);
      saveDb();

      json(response, 201, {
        success: true,
        data: newQuestion
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // PUT /api/questions/:id
  if (path.startsWith("/api/questions/") && !path.endsWith("/usage") && !isBulkQuestionRoute && method === "PUT") {
    try {
      const id = path.replace("/api/questions/", "");
      const index = db.questions.findIndex(q => q.id === id);
      if (index !== -1) {
        const payload = JSON.parse(await readBody(request));
        db.questions[index] = {
          ...db.questions[index],
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by: "Alex Wando"
        };
        saveDb();
        json(response, 200, {
          success: true,
          data: db.questions[index]
        });
      } else {
        json(response, 404, { success: false, message: "Question not found" });
      }
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // DELETE /api/questions/:id
  if (path.startsWith("/api/questions/") && !path.endsWith("/usage") && !isBulkQuestionRoute && method === "DELETE") {
    const id = path.replace("/api/questions/", "");
    const index = db.questions.findIndex(q => q.id === id);
    if (index !== -1) {
      db.questions.splice(index, 1);
      
      // Also remove reference from tests
      db.tests.forEach((t: any) => {
        if (t.questions) {
          t.questions = t.questions.filter((qid: string) => qid !== id);
        }
      });

      saveDb();
      json(response, 200, {
        success: true,
        message: "Question deleted successfully"
      });
    } else {
      json(response, 404, { success: false, message: "Question not found" });
    }
    return;
  }

  // POST /api/questions/bulk
  if (path === "/api/questions/bulk" && method === "POST") {
    try {
      const { test_id, questions } = JSON.parse(await readBody(request));

      const savedQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const norm = normalizeText(q.question);

        let existingIdx = db.questions.findIndex(eq => eq.id === q.id);
        if (existingIdx === -1) {
          existingIdx = db.questions.findIndex(eq => normalizeText(eq.question) === norm);
        }

        const questionPayload = {
          created_by: "Alex Wando",
          created_at: new Date().toISOString(),
          status: "active",
          ...q,
          test_id: q.test_id || test_id
        };

        if (existingIdx !== -1) {
          db.questions[existingIdx] = {
            ...db.questions[existingIdx],
            ...questionPayload,
            id: db.questions[existingIdx].id,
            updated_at: new Date().toISOString()
          };
          savedQuestions.push(db.questions[existingIdx]);
        } else {
          const qId = q.id || `q-${test_id}-${Date.now()}-${i}`;
          const newQuestion = {
            ...questionPayload,
            id: qId
          };
          db.questions.push(newQuestion);
          savedQuestions.push(newQuestion);
        }
      }

      const testIndex = db.tests.findIndex(t => t.id === test_id);
      if (testIndex !== -1) {
        db.tests[testIndex].questions = savedQuestions.map((q: any) => q.id);
      }

      saveDb();
      json(response, 200, {
        success: true,
        data: savedQuestions
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // POST /api/questions/fetchBulk
  if (path === "/api/questions/fetchBulk" && method === "POST") {
    try {
      const { question_ids } = JSON.parse(await readBody(request));
      const questions = db.questions.filter(q => question_ids.includes(q.id));
      json(response, 200, {
        success: true,
        data: questions
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // Serve static files for frontend SPA
  if (!path.startsWith("/api")) {
    try {
      let filePath = join(distPath, path);
      
      if (existsSync(filePath) && lstatSync(filePath).isDirectory()) {
        filePath = join(filePath, "index.html");
      }
      
      if (!existsSync(filePath)) {
        filePath = join(distPath, "index.html");
      }
      
      if (existsSync(filePath)) {
        const ext = filePath.split(".").pop()?.toLowerCase();
        let contentType = "text/html";
        if (ext === "js") contentType = "application/javascript";
        else if (ext === "css") contentType = "text/css";
        else if (ext === "png") contentType = "image/png";
        else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
        else if (ext === "svg") contentType = "image/svg+xml";
        else if (ext === "ico") contentType = "image/x-icon";
        else if (ext === "json") contentType = "application/json";

        const content = readFileSync(filePath);
        response.writeHead(200, { 
          "Content-Type": contentType,
          "Cache-Control": ext === "html" ? "no-cache" : "public, max-age=31536000, immutable"
        });
        response.end(content);
        return;
      }
    } catch (e) {
      console.error("Error serving static file:", e);
    }
  }

  json(response, 404, { success: false, message: "Route not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`PrepRoute backend listening at http://0.0.0.0:${port}`);
});

