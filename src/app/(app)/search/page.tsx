import TopBar from '@/components/TopBar';
import SearchClient from './SearchClient';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <>
      <TopBar title="Поиск" />
      <SearchClient />
    </>
  );
}
