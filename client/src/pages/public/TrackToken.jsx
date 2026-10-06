import { QrCode } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, Input } from '../../components/ui.jsx';

export default function TrackToken() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6">
        <span className="grid size-12 place-items-center rounded-xl bg-saffron-50 text-saffron-700">
          <QrCode className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl">Track your token</h1>
        <p className="mt-1 text-sm text-temple-600">
          Enter the code printed on your token (for example SD-7K4P9Q), or scan its QR code with your phone camera.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const value = code.trim().toUpperCase();
            if (value) navigate(`/t/${value.startsWith('SD-') ? value : `SD-${value}`}`);
          }}
        >
          <Field label="Token code" htmlFor="code">
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SD-XXXXXX"
              className="font-mono text-lg uppercase"
              autoFocus
            />
          </Field>
          <Button type="submit" className="w-full">
            Show live status
          </Button>
        </form>
      </Card>
    </div>
  );
}
