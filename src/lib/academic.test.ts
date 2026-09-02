import { describe, expect, it } from "vitest";

import { formatDegreeCourse, isValidCourse, isValidDegree } from "./academic";

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
