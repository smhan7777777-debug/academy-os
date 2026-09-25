import "../server/paths.js";
import { agentConnection } from "../server/agent-workspace.js";
import { AGENT_CATALOG } from "../shared/agent-catalog.js";
const status = agentConnection();
console.log("배움결 Agent1000 설정 점검 (인증값은 출력하지 않습니다)");
console.log(
  `입력·실행 연결 규격: ${AGENT_CATALOG.filter((a) => a.available).length}종 / 핵심 ${AGENT_CATALOG.filter((a) => a.priority).length}종`,
);
console.log(`저장 방식: ${status.storage}`);
for (const issue of status.issues) console.log(`- ${issue}`);
console.log(
  status.ready
    ? "설정 형식이 준비됐습니다. 실제 서버 인증과 각 에이전트 응답은 업무실에서 별도 확인해야 합니다."
    : "입력 초안은 준비할 수 있습니다. 실제 AI 실행은 위 설정을 완료한 뒤 가능합니다.",
);
console.log("외부 게시·문자·결제 호출은 이 점검에서 수행하지 않았습니다.");
process.exitCode = status.ready ? 0 : 1;
