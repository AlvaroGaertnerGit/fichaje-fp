import { describe, expect, it } from "vitest";

import {
  coursesForDegree,
  formatDegreeCourse,
  isCourseAllowedForDegree,
  isValidCourse,
  isValidDegree,
} from "./academic";

describe("isValidDegree", () => {
  it("acepta SMR y ASIR", () => {
    expect(isValidDegree("SMR")).toBe(true);
    expect(isValidDegree("ASIR")).toBe(true);
  });

  it("rechaza cualquier otro valor", () => {
    expect(isValidDegree("DAM")).toBe(false);
    expect(isValidDegree("admin")).toBe(false);
    expect(isValidDegree("")).toBe(false);
  });
});

describe("isValidCourse", () => {
  it("acepta '1' y '2'", () => {
    expect(isValidCourse("1")).toBe(true);
    expect(isValidCourse("2")).toBe(true);
  });

  it("rechaza cualquier otro valor, incluida una frase combinada", () => {
    expect(isValidCourse("3")).toBe(false);
    expect(isValidCourse("1º SMR")).toBe(false);
    expect(isValidCourse("")).toBe(false);
  });
});

describe("coursesForDegree / isCourseAllowedForDegree", () => {
  it("SMR oferta 1º y 2º", () => {
    expect(coursesForDegree("SMR")).toEqual(["1", "2"]);
  });

  it("ASIR solo oferta 1º", () => {
    expect(coursesForDegree("ASIR")).toEqual(["1"]);
  });

  it("ASIR + curso 1 -> válido", () => {
    expect(isCourseAllowedForDegree("ASIR", "1")).toBe(true);
  });

  it("ASIR + curso 2 -> inválido (no existe esa oferta académica)", () => {
    expect(isCourseAllowedForDegree("ASIR", "2")).toBe(false);
  });

  it("SMR + curso 1 -> válido", () => {
    expect(isCourseAllowedForDegree("SMR", "1")).toBe(true);
  });

  it("SMR + curso 2 -> válido", () => {
    expect(isCourseAllowedForDegree("SMR", "2")).toBe(true);
  });
});

describe("formatDegreeCourse", () => {
  it("combina grado y curso solo para mostrar", () => {
    expect(formatDegreeCourse("SMR", "1")).toBe("SMR 1º");
    expect(formatDegreeCourse("ASIR", "2")).toBe("ASIR 2º");
  });

  it("null si falta cualquiera de los dos (teacher/admin sin grado/curso)", () => {
    expect(formatDegreeCourse(null, "1")).toBeNull();
    expect(formatDegreeCourse("SMR", null)).toBeNull();
    expect(formatDegreeCourse(null, null)).toBeNull();
  });
});
