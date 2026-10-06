import { Compass } from 'lucide-react';
import { EmptyState, LinkButton } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="px-4 py-20">
      <EmptyState
        icon={Compass}
        title="Page not found"
        message="The page you are looking for does not exist."
        action={<LinkButton to="/">Go to temples</LinkButton>}
      />
    </div>
  );
}
