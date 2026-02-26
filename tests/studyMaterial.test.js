/**
 * Test Suite for Study Materials Component
 *
 * To run tests: npm install --save-dev jest supertest @jest/globals
 * Then: npm test
 *
 * File: tests/studyMaterial.test.js
 */

import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import StudyMaterial from "../models/StudyMaterialModel.js";
import User from "../models/UserModel.js";

describe("Study Materials API", () => {
  let tutorToken;
  let tutorUserId;
  let materialId;
  let adminToken;

  beforeAll(async () => {
    // Connect to TEST database
    await mongoose.connect(process.env.MONGO_TEST_URI);

    // Create test tutor user
    const tutorRes = await request(app).post("/api/auth/register").send({
      fullName: "Test Tutor",
      email: "tutor@test.com",
      password: "password123",
      phoneNumber: "1234567890",
      location: "Test City",
      role: "tutor",
    });

    tutorToken = tutorRes.body.data.token;
    tutorUserId = tutorRes.body.data.user._id;

    // Create test admin user
    const adminRes = await request(app).post("/api/auth/register").send({
      fullName: "Test Admin",
      email: "admin@test.com",
      password: "password123",
      phoneNumber: "9876543210",
      location: "Admin City",
      role: "admin",
    });

    adminToken = adminRes.body.data.token;
  });

  afterAll(async () => {
    await StudyMaterial.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe("POST /api/materials - Create Study Material", () => {
    test("Should create material with valid data", async () => {
      const res = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .field("title", "Advanced Algebra")
        .field("description", "A comprehensive guide to algebra concepts")
        .field("subject", "Mathematics")
        .field("grade", "10th")
        .field("tags", "algebra,math,10th-grade")
        .attach("file", "tests/fixtures/sample.pdf");

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data.title).toBe("Advanced Algebra");

      materialId = res.body.data._id;
    });

    test("Should fail without authentication", async () => {
      const res = await request(app)
        .post("/api/materials")
        .field("title", "Unauthorized Material")
        .field("description", "This should fail")
        .field("subject", "Physics")
        .field("grade", "11th")
        .attach("file", "tests/fixtures/sample.pdf");

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test("Should fail for non-tutor users", async () => {
      const userRes = await request(app).post("/api/auth/register").send({
        fullName: "Regular User",
        email: "user@test.com",
        password: "password123",
        phoneNumber: "5555555555",
        location: "User City",
        role: "user",
      });

      const userToken = userRes.body.data.token;

      const res = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${userToken}`)
        .field("title", "User Material")
        .field("description", "Regular users cannot upload")
        .field("subject", "Science")
        .field("grade", "9th")
        .attach("file", "tests/fixtures/sample.pdf");

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test("Should fail without file", async () => {
      const res = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .send({
          title: "No File Material",
          description: "This material has no file",
          subject: "History",
          grade: "10th",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/file/i);
    });

    test("Should fail with invalid title length", async () => {
      const res = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .field("title", "AB") // Too short
        .field("description", "A comprehensive guide")
        .field("subject", "Science")
        .field("grade", "9th")
        .attach("file", "tests/fixtures/sample.pdf");

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Title must be/i);
    });

    test("Should prevent duplicate materials from same uploader", async () => {
      await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .field("title", "Duplicate Test")
        .field("description", "First upload of this material")
        .field("subject", "English")
        .field("grade", "9th")
        .attach("file", "tests/fixtures/sample.pdf");

      const res = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .field("title", "Duplicate Test")
        .field("description", "Second upload of same material")
        .field("subject", "English")
        .field("grade", "9th")
        .attach("file", "tests/fixtures/sample2.pdf");

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already/i);
    });
  });

  describe("GET /api/materials - List Materials", () => {
    test("Should get all materials with pagination", async () => {
      const res = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toHaveProperty("total");
      expect(res.body.pagination).toHaveProperty("pages");
      expect(res.body.data).toBeInstanceOf(Array);
    });

    test("Should filter by subject", async () => {
      const res = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ subject: "mathematics" });

      expect(res.statusCode).toBe(200);
      res.body.data.forEach((material) => {
        expect(material.subject).toBe("mathematics");
      });
    });

    test("Should filter by grade", async () => {
      const res = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ grade: "10th" });

      expect(res.statusCode).toBe(200);
      res.body.data.forEach((material) => {
        expect(material.grade).toBe("10th");
      });
    });

    test("Should search by keyword", async () => {
      const res = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ keyword: "algebra" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test("Should sort by latest", async () => {
      const res = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ sort: "latest" });

      expect(res.statusCode).toBe(200);
      for (let i = 1; i < res.body.data.length; i++) {
        expect(
          new Date(res.body.data[i - 1].createdAt) >=
            new Date(res.body.data[i].createdAt),
        ).toBe(true);
      }
    });

    test("Should respect limit (max 100)", async () => {
      const res = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ limit: 200 }); // Should cap at 100

      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
    });

    test("Should fail without authentication", async () => {
      const res = await request(app).get("/api/materials");

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/materials/:id - Get Single Material", () => {
    test("Should get material by ID", async () => {
      const res = await request(app)
        .get(`/api/materials/${materialId}`)
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(String(materialId));
    });

    test("Should increment view count", async () => {
      const before = await StudyMaterial.findById(materialId);
      const viewsBefore = before.metrics.views;

      await request(app)
        .get(`/api/materials/${materialId}`)
        .set("Authorization", `Bearer ${tutorToken}`);

      const after = await StudyMaterial.findById(materialId);
      expect(after.metrics.views).toBe(viewsBefore + 1);
    });

    test("Should fail with invalid ID format", async () => {
      const res = await request(app)
        .get("/api/materials/invalid-id")
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Invalid ID/i);
    });

    test("Should return 404 for non-existent material", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/materials/${fakeId}`)
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/materials/:id - Update Material", () => {
    test("Should update material by uploader", async () => {
      const res = await request(app)
        .patch(`/api/materials/${materialId}`)
        .set("Authorization", `Bearer ${tutorToken}`)
        .send({
          title: "Updated Algebra",
          description: "Updated description",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Updated Algebra");
    });

    test("Should update material by admin", async () => {
      const res = await request(app)
        .patch(`/api/materials/${materialId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          subject: "AlgebraAdvanced",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.subject).toBe("algebraadvanced"); // Should be lowercase
    });

    test("Should fail for unauthorized user", async () => {
      const otherTutorRes = await request(app).post("/api/auth/register").send({
        fullName: "Other Tutor",
        email: "other@test.com",
        password: "password123",
        phoneNumber: "4444444444",
        location: "Other City",
        role: "tutor",
      });

      const otherToken = otherTutorRes.body.data.token;

      const res = await request(app)
        .patch(`/api/materials/${materialId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({
          title: "Hacked Title",
        });

      expect(res.statusCode).toBe(403);
    });

    test("Should not allow updating uploadedBy", async () => {
      const otherUserId = new mongoose.Types.ObjectId();

      await request(app)
        .patch(`/api/materials/${materialId}`)
        .set("Authorization", `Bearer ${tutorToken}`)
        .send({
          uploadedBy: otherUserId,
        });

      const updated = await StudyMaterial.findById(materialId);
      expect(String(updated.uploadedBy)).toBe(tutorUserId);
    });
  });

  describe("DELETE /api/materials/:id - Delete Material", () => {
    test("Should delete material by uploader", async () => {
      const newMaterialRes = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .field("title", "To Delete")
        .field("description", "This will be deleted")
        .field("subject", "Chemistry")
        .field("grade", "12th")
        .attach("file", "tests/fixtures/sample.pdf");

      const deleteId = newMaterialRes.body.data._id;

      const res = await request(app)
        .delete(`/api/materials/${deleteId}`)
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's deleted
      const checkRes = await request(app)
        .get(`/api/materials/${deleteId}`)
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(checkRes.statusCode).toBe(404);
    });

    test("Should allow admin to delete any material", async () => {
      const newMaterialRes = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .field("title", "Admin Delete Test")
        .field("description", "Admin will delete this")
        .field("subject", "Biology")
        .field("grade", "11th")
        .attach("file", "tests/fixtures/sample.pdf");

      const deleteId = newMaterialRes.body.data._id;

      const res = await request(app)
        .delete(`/api/materials/${deleteId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test("Should fail for unauthorized user", async () => {
      const otherTutorRes = await request(app).post("/api/auth/register").send({
        fullName: "Other Tutor 2",
        email: "other2@test.com",
        password: "password123",
        phoneNumber: "3333333333",
        location: "Other City 2",
        role: "tutor",
      });

      const otherToken = otherTutorRes.body.data.token;

      const res = await request(app)
        .delete(`/api/materials/${materialId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe("Edge Cases & Error Scenarios", () => {
    test("Should sanitize input to prevent NoSQL injection", async () => {
      const res = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ subject: { $ne: "" } }); // Injection attempt

      // Should either fail gracefully or treat as string
      expect([200, 400]).toContain(res.statusCode);
    });

    test("Should handle invalid JSON gracefully", async () => {
      const res = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .set("Content-Type", "application/json")
        .send("invalid json");

      expect(res.statusCode).toBe(400);
    });

    test("Should validate file MIME type", async () => {
      const res = await request(app)
        .post("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .field("title", "Exe File Test")
        .field("description", "Trying to upload exe")
        .field("subject", "Scripts")
        .field("grade", "12th")
        .attach("file", "tests/fixtures/malicious.exe");

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/not allowed|type/i);
    });
  });

  describe("Performance & Load", () => {
    test("Should handle concurrent requests", async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .get("/api/materials")
            .set("Authorization", `Bearer ${tutorToken}`),
        );

      const results = await Promise.all(requests);
      results.forEach((res) => {
        expect(res.statusCode).toBe(200);
      });
    });

    test("Pagination should work with large datasets", async () => {
      const res1 = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ page: 1, limit: 5 });

      const res2 = await request(app)
        .get("/api/materials")
        .set("Authorization", `Bearer ${tutorToken}`)
        .query({ page: 2, limit: 5 });

      expect(res1.body.pagination.current).toBe(1);
      expect(res2.body.pagination.current).toBe(2);

      // Materials should be different
      const ids1 = res1.body.data.map((m) => m._id);
      const ids2 = res2.body.data.map((m) => m._id);
      const hasDifference = ids1.some((id) => !ids2.includes(id));
      expect(hasDifference).toBe(true);
    });
  });
});
