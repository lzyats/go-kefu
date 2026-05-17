import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import ChatDemo from "../pages/chat-demo/page";
import ChatFullscreen from "../pages/chat-fullscreen/page";
import AgentLogin from "../pages/agent-login/page";
import AgentDashboard from "../pages/agent-dashboard/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/chat-demo",
    element: <ChatDemo />,
  },
  {
    path: "/chat-fullscreen",
    element: <ChatFullscreen />,
  },
  {
    path: "/agent-login",
    element: <AgentLogin />,
  },
  {
    path: "/agent-dashboard",
    element: <AgentDashboard />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
