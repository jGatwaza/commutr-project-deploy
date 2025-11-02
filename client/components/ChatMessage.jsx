function ChatMessage({ content, isUser }) {
  const avatarSVG = isUser 
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" fill="#5f6368"/>
        <path d="M12 13C8.13 13 5 14.57 5 16.5V18H19V16.5C19 14.57 15.87 13 12 13Z" fill="#5f6368"/>
       </svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" fill="#468189"/>
        <path d="M12 13C8.13 13 5 14.57 5 16.5V18H19V16.5C19 14.57 15.87 13 12 13Z" fill="#468189"/>
        <path d="M17 10C17 11.66 15.66 13 14 13V15C16.76 15 19 12.76 19 10H17Z" fill="#468189"/>
        <path d="M7 10H5C5 12.76 7.24 15 10 15V13C8.34 13 7 11.66 7 10Z" fill="#468189"/>
       </svg>`;

  return (
    <div className={`message ${isUser ? 'user' : 'agent'}`}>
      <div 
        className="message-avatar" 
        dangerouslySetInnerHTML={{ __html: avatarSVG }}
      />
      <div className="message-content">{content}</div>
    </div>
  );
}

export default ChatMessage;
