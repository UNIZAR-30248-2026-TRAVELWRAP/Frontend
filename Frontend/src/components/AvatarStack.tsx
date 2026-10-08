import Avatar, { type Miembro } from "./Avatar"

export default function AvatarStack({
  members,
  size = 30,
}: {
  members: Miembro[]
  size?: number
}) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {members.map((m, i) => (
        <div
          key={m.name}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.33,
            zIndex: members.length - i,
          }}
        >
          <Avatar member={m} size={size} />
        </div>
      ))}
    </div>
  )
}
