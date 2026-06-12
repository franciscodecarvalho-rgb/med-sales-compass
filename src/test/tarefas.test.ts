import { describe, expect, it } from "vitest";
import { sortTarefas, tarefaScore } from "@/lib/tarefas";

function diasAPartirDeHoje(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

describe("tarefaScore", () => {
  it("concluída vai para o fim (4)", () => {
    expect(tarefaScore({ status: "concluida", data_vencimento: diasAPartirDeHoje(-5) })).toBe(4);
  });

  it("atrasada vem primeiro (0), mesmo sem data", () => {
    expect(tarefaScore({ status: "atrasada", data_vencimento: null })).toBe(0);
    expect(tarefaScore({ status: "pendente", data_vencimento: diasAPartirDeHoje(-2) })).toBe(0);
  });

  it("vencendo hoje fica entre atrasadas e futuras (1)", () => {
    expect(tarefaScore({ status: "pendente", data_vencimento: new Date().toISOString() })).toBe(1);
  });

  it("futuras (2) antes de sem data (3)", () => {
    expect(tarefaScore({ status: "pendente", data_vencimento: diasAPartirDeHoje(3) })).toBe(2);
    expect(tarefaScore({ status: "pendente", data_vencimento: null })).toBe(3);
  });
});

describe("sortTarefas", () => {
  it("ordena atrasadas → hoje → futuras → sem data → concluídas", () => {
    const tarefas = [
      { id: "concluida", status: "concluida", data_vencimento: diasAPartirDeHoje(-10) },
      { id: "semData", status: "pendente", data_vencimento: null },
      { id: "futura", status: "pendente", data_vencimento: diasAPartirDeHoje(5) },
      { id: "hoje", status: "pendente", data_vencimento: new Date().toISOString() },
      { id: "atrasada", status: "atrasada", data_vencimento: diasAPartirDeHoje(-1) },
    ];
    expect(sortTarefas(tarefas).map((t) => t.id)).toEqual([
      "atrasada", "hoje", "futura", "semData", "concluida",
    ]);
  });

  it("dentro do mesmo grupo, ordena por vencimento crescente", () => {
    const tarefas = [
      { id: "b", status: "pendente", data_vencimento: diasAPartirDeHoje(7) },
      { id: "a", status: "pendente", data_vencimento: diasAPartirDeHoje(2) },
    ];
    expect(sortTarefas(tarefas).map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("não muta o array original", () => {
    const tarefas = [
      { id: "1", status: "concluida", data_vencimento: null },
      { id: "2", status: "atrasada", data_vencimento: null },
    ];
    sortTarefas(tarefas);
    expect(tarefas.map((t) => t.id)).toEqual(["1", "2"]);
  });
});
