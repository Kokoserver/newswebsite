export function commentAutoApproveEnabled() {
  return (process.env.COMMENT_AUTO_APPROVE ?? "true") !== "false";
}
