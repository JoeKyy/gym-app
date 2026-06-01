---
applyTo: "src/lib/exercises/**,src/components/Biblioteca*.tsx,app/exercises/**"
---

# Contexto lombar — GymApp

Este projeto adapta o dataset público `free-exercise-db` e o classifica por
segurança para um usuário com quadro lombar **L4-L5 (extrusão + Modic I)**.

## Regras inegociáveis
- A fonte única da verdade clínica é `src/lib/exercises/lumbar-profile.ts`
  (`LUMBAR_PROFILE`). **Nunca** cravar risco no nome do exercício; sempre
  resolver via `toleranceFor()` / `worstTolerance()`.
- Classifique cada exercício mapeando-o para `MechanicalDemand[]` e cruzando com
  o perfil. Demandas a detectar: flexão lombar carregada/repetida, rotação sob
  carga, carga axial em pé, extensão de fim de curso, impacto/balístico, hip
  hinge, postura estática prolongada, core anti-movimento, isolamento apoiado.
- Itens `avoid` **não podem** entrar em plano nem em sugestão, em nenhum caminho.
- Em `state: "crisis"`, só liberar core anti-movimento e isolamento apoiado.
- Respeitar `directionalPreference`: só tratar extensão de fim de curso como
  segura quando for `"extension"`.

## Estilo
- A classificação é **triagem heurística, não laudo**. UI deve rotular `caution`
  como "revisar antes de usar" e nunca prometer "eliminar a dor".
- Exibir sempre o *porquê* (`safety.reasons`) ao lado do exercício.
- Tema escuro (`#111827`), mobile-first, Tailwind, TypeScript estrito.

## O que NÃO fazer
- Não inventar dados clínicos. Campos `// PREENCHER` no perfil ficam como estão
  até o usuário confirmar com o fisioterapeuta.
- Não reintroduzir links de imagem/vídeo externos como dependência dura — servir
  do próprio domínio (`public/data/...`).
