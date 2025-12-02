import { useState } from "react";
import "./App.css";
import logoEb from "./assets/EB.PNG";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

function parseCurrencyToNumber(value) {
  if (!value) return 0;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(value) {
  if (value == null || isNaN(value)) return "—";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// --- Icones simples em SVG (sem libs extras) ---

function IconIrrf() {
  return (
    <svg viewBox="0 0 24 24" className="eb-icon">
      <rect x="3" y="4" width="18" height="14" rx="2" ry="2" />
      <path d="M7 9h10M7 13h5" />
    </svg>
  );
}

function IconInss() {
  return (
    <svg viewBox="0 0 24 24" className="eb-icon">
      <circle cx="12" cy="12" r="4" />
      <path d="M4 12a8 8 0 0 1 8-8m0 16a8 8 0 0 0 8-8" />
    </svg>
  );
}

function IconRescisao() {
  return (
    <svg viewBox="0 0 24 24" className="eb-icon">
      <path d="M5 4h10l4 4v12H5z" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  );
}

function IconCusto() {
  return (
    <svg viewBox="0 0 24 24" className="eb-icon">
      <circle cx="8" cy="8" r="3" />
      <path d="M4 20v-1a4 4 0 0 1 4-4 4 4 0 0 1 4 4v1" />
      <path d="M14 9h5M14 13h5M16.5 7v8" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" className="eb-icon">
      <path d="M4 7h16M4 12h10M4 17h16" />
    </svg>
  );
}

// --- Componentes auxiliares ---

function SidebarItem({ icon, label, active, collapsed, onClick }) {
  return (
    <button
      className={`eb-sidebar-item ${active ? "is-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function ComingSoon({ title }) {
  return (
    <div className="eb-content">
      <div className="eb-content-header">
        <h1>{title}</h1>
      </div>
      <div className="eb-card eb-coming-card">
        <p>Em construção.</p>
      </div>
    </div>
  );
}

// --- Simulador IRRF (miolo principal) ---

function IrrfSimulator() {
  const [rows, setRows] = useState([
    {
      id: 1,
      matricula: "",
      nome: "",
      salarioBruto: "",
      dependentes: "0",
      baseIrrf: 0,
      resultado: null,
      erro: null,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [modalRow, setModalRow] = useState(null);

  function addRow() {
    const nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
    setRows([
      ...rows,
      {
        id: nextId,
        matricula: "",
        nome: "",
        salarioBruto: "",
        dependentes: "0",
        baseIrrf: 0,
        resultado: null,
        erro: null,
      },
    ]);
  }

  function removeRow(id) {
    if (rows.length === 1) return;
    setRows(rows.filter((r) => r.id !== id));
  }

  function updateRow(id, field, value) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function handleCalcularTodos() {
    setLoading(true);
    const novasLinhas = [];

    for (const row of rows) {
      const bruto = parseCurrencyToNumber(row.salarioBruto);
      const deps = Number(row.dependentes || 0);

      if (!row.matricula && !row.nome && bruto === 0 && deps === 0) {
        novasLinhas.push({ ...row, baseIrrf: 0, resultado: null, erro: null });
        continue;
      }

      if (bruto <= 0) {
        novasLinhas.push({
          ...row,
          baseIrrf: 0,
          resultado: null,
          erro: "Salário inválido",
        });
        continue;
      }

      try {
        const resp = await fetch(`${API_BASE}/calcular-irrf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salario_bruto: bruto,
            dependentes: deps,
          }),
        });

        const data = await resp.json();

        if (!resp.ok) {
          novasLinhas.push({
            ...row,
            baseIrrf: 0,
            resultado: null,
            erro: data.error || "Erro",
          });
        } else {
          novasLinhas.push({
            ...row,
            baseIrrf: data.base_irrf ?? 0,
            resultado: data,
            erro: null,
          });
        }
      } catch (err) {
        console.error(err);
        novasLinhas.push({
          ...row,
          baseIrrf: 0,
          resultado: null,
          erro: "Sem conexão",
        });
      }
    }

    setRows(novasLinhas);
    setLoading(false);
  }

  function openModal(row) {
    if (!row.resultado) return;
    setModalRow(row);
  }

  function closeModal() {
    setModalRow(null);
  }

  function exportPdf(row) {
    const r = row.resultado;
    if (!r) return;

    const win = window.open("", "_blank");
    if (!win) return;

    const ir2025 = r.ir_2025 ?? r.ir_tabela ?? 0;
    const ir2026 = r.ir_2026 ?? r.ir_devido ?? 0;

    const html = `
      <html>
        <head>
          <title>Memória de Cálculo - EB Calc</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 16px; margin-top: 18px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            td.label { font-weight: 600; width: 45%; }
          </style>
        </head>
        <body>
          <h1>Memória de Cálculo - EB Calc</h1>
          <div>Colaborador: <strong>${row.matricula || ""} - ${
      row.nome || ""
    }</strong></div>

          <h2>Base e deduções</h2>
          <table>
            <tr><td class="label">Rendimento tributável</td><td>${formatCurrency(
              r.rendimento_tributavel ?? r.salario_bruto
            )}</td></tr>
            <tr><td class="label">INSS calculado</td><td>${formatCurrency(
              r.inss_real
            )}</td></tr>
            <tr><td class="label">Dedução simplificada</td><td>${formatCurrency(
              r.deducao_simplificada
            )}</td></tr>
            <tr><td class="label">Dedução utilizada</td><td>${formatCurrency(
              r.deducao_utilizada
            )}</td></tr>
            <tr><td class="label">Dependentes</td><td>${
              r.dependentes ?? 0
            }</td></tr>
            <tr><td class="label">Dedução dependentes</td><td>${formatCurrency(
              r.deducao_dependentes
            )}</td></tr>
            <tr><td class="label">Base IRRF</td><td>${formatCurrency(
              r.base_irrf
            )}</td></tr>
          </table>

          <h2>IRRF 2025 x 2026</h2>
          <table>
            <tr><td class="label">IRRF 2025</td><td>${formatCurrency(
              ir2025
            )}</td></tr>
            <tr><td class="label">Redução reforma 2026</td><td>${formatCurrency(
              r.reducao_reforma
            )}</td></tr>
            <tr><td class="label">IRRF 2026</td><td>${formatCurrency(
              ir2026
            )}</td></tr>
          </table>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <>
      <div className="eb-content">
        <div className="eb-content-header">
          <h1>Simulador IRRF 2026</h1>
        </div>

        <div className="eb-card eb-grid-card">
          <div className="eb-grid-header">
            <div className="eb-grid-title">Colaboradores</div>
            <div className="eb-grid-actions">
              <button
                type="button"
                onClick={addRow}
                className="eb-btn eb-btn-secondary"
              >
                + Linha
              </button>
              <button
                type="button"
                onClick={handleCalcularTodos}
                className="eb-btn eb-btn-primary"
                disabled={loading}
              >
                {loading ? "Calculando..." : "Calcular IRRF"}
              </button>
            </div>
          </div>

          <div className="eb-table-wrapper">
            <table className="eb-table">
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Nome</th>
                  <th>Salário bruto</th>
                  <th>Dep.</th>
                  <th>Cálculo INSS</th>
                  <th>Base IRRF</th>
                  <th>IRRF 2026</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const r = row.resultado;
                  const inssTxt = r
                    ? formatCurrency(r.inss_real) +
                      " • " +
                      (r.deducao_utilizada === r.inss_real
                        ? "INSS"
                        : "Simplif.")
                    : "—";
                  const ir2026 = r?.ir_2026 ?? r?.ir_devido ?? 0;

                  return (
                    <tr
                      key={row.id}
                      className={row.erro ? "eb-row-error" : ""}
                    >
                      <td>
                        <input
                          type="text"
                          value={row.matricula}
                          onChange={(e) =>
                            updateRow(row.id, "matricula", e.target.value)
                          }
                          placeholder="0001"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.nome}
                          onChange={(e) =>
                            updateRow(row.id, "nome", e.target.value)
                          }
                          placeholder="Nome"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.salarioBruto}
                          onChange={(e) =>
                            updateRow(row.id, "salarioBruto", e.target.value)
                          }
                          placeholder="6.000,00"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={row.dependentes}
                          onChange={(e) =>
                            updateRow(row.id, "dependentes", e.target.value)
                          }
                        />
                      </td>
                      <td className="eb-cell-number eb-cell-small">
                        {inssTxt}
                      </td>
                      <td className="eb-cell-number">
                        {row.baseIrrf ? formatCurrency(row.baseIrrf) : "—"}
                      </td>
                      <td className="eb-cell-number eb-cell-bold">
                        {r ? formatCurrency(ir2026) : "—"}
                      </td>
                      <td className="eb-actions-cell">
                        {row.erro && (
                          <span className="eb-error-chip">{row.erro}</span>
                        )}
                        {r && (
                          <button
                            type="button"
                            className="eb-btn eb-btn-ghost"
                            onClick={() => openModal(row)}
                          >
                            Detalhes
                          </button>
                        )}
                        <button
                          type="button"
                          className="eb-btn eb-btn-icon"
                          onClick={() => removeRow(row.id)}
                          title="Remover linha"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalRow && (
        <div className="eb-modal-backdrop" onClick={closeModal}>
          <div
            className="eb-modal"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="eb-modal-header">
              <div>
                <h3>Memória de cálculo</h3>
                <p>
                  {modalRow.matricula} · {modalRow.nome}
                </p>
              </div>
              <button
                type="button"
                className="eb-btn eb-btn-icon"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="eb-modal-body">
              {(() => {
                const r = modalRow.resultado;
                if (!r) return null;
                const ir2025 = r.ir_2025 ?? r.ir_tabela ?? 0;
                const ir2026 = r.ir_2026 ?? r.ir_devido ?? 0;

                return (
                  <>
                    <div className="eb-modal-section">
                      <ul>
                        <li>
                          Rendimento tributável:{" "}
                          {formatCurrency(
                            r.rendimento_tributavel ?? r.salario_bruto
                          )}
                        </li>
                        <li>
                          INSS: {formatCurrency(r.inss_real)} | Simplif.:{" "}
                          {formatCurrency(r.deducao_simplificada)} | Usado:{" "}
                          {formatCurrency(r.deducao_utilizada)}
                        </li>
                        <li>
                          Dependentes: {r.dependentes ?? 0} · Dedução:{" "}
                          {formatCurrency(r.deducao_dependentes)}
                        </li>
                        <li>
                          Base IRRF:{" "}
                          <strong>{formatCurrency(r.base_irrf)}</strong>
                        </li>
                      </ul>
                    </div>
                    <div className="eb-modal-section">
                      <ul>
                        <li>
                          IRRF 2025: {formatCurrency(ir2025)}
                        </li>
                        <li>
                          Redução reforma:{" "}
                          {formatCurrency(r.reducao_reforma)}
                        </li>
                        <li>
                          IRRF 2026:{" "}
                          <strong>{formatCurrency(ir2026)}</strong>
                        </li>
                      </ul>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="eb-modal-footer">
              <button
                type="button"
                className="eb-btn eb-btn-secondary"
                onClick={() => exportPdf(modalRow)}
              >
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- App com Sidebar ---

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("irrf");

  const titleMap = {
    irrf: "Simulador IRRF 2026",
    inss: "Calculadora INSS",
    rescisao: "Simulador de rescisão",
    custo: "Custo do funcionário",
  };

  return (
    <div className={`eb-shell-layout ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="eb-sidebar">
        <div className="eb-sidebar-top">
          <div className="eb-sidebar-logo">
            <img src={logoEb} alt="EB Educação" />
            {!collapsed && <span>EB Calc</span>}
          </div>
          <button
            type="button"
            className="eb-btn eb-btn-icon eb-sidebar-toggle"
            onClick={() => setCollapsed((v) => !v)}
          >
            <IconMenu />
          </button>
        </div>

        <nav className="eb-sidebar-nav">
          <SidebarItem
            icon={<IconIrrf />}
            label="Simulador IRRF 2026"
            collapsed={collapsed}
            active={activePage === "irrf"}
            onClick={() => setActivePage("irrf")}
          />
          <SidebarItem
            icon={<IconInss />}
            label="Calculadora INSS"
            collapsed={collapsed}
            active={activePage === "inss"}
            onClick={() => setActivePage("inss")}
          />
          <SidebarItem
            icon={<IconRescisao />}
            label="Simulador de rescisão"
            collapsed={collapsed}
            active={activePage === "rescisao"}
            onClick={() => setActivePage("rescisao")}
          />
          <SidebarItem
            icon={<IconCusto />}
            label="Custo funcionário"
            collapsed={collapsed}
            active={activePage === "custo"}
            onClick={() => setActivePage("custo")}
          />
        </nav>
      </aside>

      <div className="eb-shell-main">
        <header className="eb-topbar">
          <span className="eb-topbar-title">{titleMap[activePage]}</span>
        </header>

        <main className="eb-main">
          {activePage === "irrf" && <IrrfSimulator />}

          {activePage === "inss" && (
            <ComingSoon title={titleMap.inss} />
          )}
          {activePage === "rescisao" && (
            <ComingSoon title={titleMap.rescisao} />
          )}
          {activePage === "custo" && (
            <ComingSoon title={titleMap.custo} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
