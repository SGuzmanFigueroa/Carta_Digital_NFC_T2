'use client';

import { useState } from 'react';
import { ScreenTab, Ticket, Runner } from '@/types';
import { INITIAL_TICKETS, INITIAL_RUNNERS, CATALOG_DISHES } from '@/data/initialData';
import { Header } from '@/components/Header';
import { KDSBoard } from '@/components/KDSBoard';
import { CentralPedidos } from '@/components/CentralPedidos';
import { PanelAdmin } from '@/components/PanelAdmin';
import { GestionUsuarios } from '@/components/GestionUsuarios';
import { Configuracion } from '@/components/Configuracion';
import { kitchenAudio } from '@/utils/audio';

export default function KDSRefinedPage() {
  const [currentTab, setCurrentTab] = useState<ScreenTab>('cocina_kds');
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [runners, setRunners] = useState<Runner[]>(INITIAL_RUNNERS);

  // Active tickets count
  const activeCount = tickets.filter(
    (t) => t.status !== 'lista_despachada' && t.status !== 'archivada'
  ).length;
  const urgentCount = tickets.filter(
    (t) =>
      t.status !== 'lista_despachada' &&
      (t.isUrgent || t.elapsedSeconds > t.targetSeconds)
  ).length;

  const handleResetData = () => {
    setTickets(INITIAL_TICKETS);
    setRunners(INITIAL_RUNNERS);
    kitchenAudio.playDispatchSound();
  };

  const handleSimulateNewOrder = () => {
    const randomDish1 =
      CATALOG_DISHES[Math.floor(Math.random() * CATALOG_DISHES.length)];
    const randomDish2 =
      CATALOG_DISHES[Math.floor(Math.random() * CATALOG_DISHES.length)];
    const randomTableNum = Math.floor(Math.random() * 15) + 1;
    const tableStr = `MESA ${randomTableNum.toString().padStart(2, '0')}`;
    const newTicketId = `ticket-sim-${Date.now().toString().slice(-4)}`;
    const randomOrderNum = Math.floor(Math.random() * 90) + 110;

    const newTicket: Ticket = {
      id: newTicketId,
      orderNumber: randomOrderNum,
      table: tableStr,
      zone: 'SALÓN PRINCIPAL',
      serviceType: 'Comanda Externa TPV',
      elapsedSeconds: 0,
      targetSeconds: 600,
      serverOrRunner: 'VALERIA P.',
      serverRole: 'CAMARERO',
      totalAmount: randomDish1.price + randomDish2.price,
      status: 'ingresada',
      timestamp: new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      stationFilterTags: [randomDish1.station, randomDish2.station],
      items: [
        {
          id: `item-${newTicketId}-1`,
          name: `1x ${randomDish1.name}`,
          quantity: 1,
          station: randomDish1.station,
          stationBadge: randomDish1.stationBadge,
          status: 'pendiente',
          cookingNotes: [randomDish1.notes],
          price: randomDish1.price,
          photoUrl: randomDish1.photoUrl,
          checked: false,
          allergens: randomDish1.allergens,
          prepTimeMinutes: parseInt(randomDish1.prepTime) || 8,
        },
        {
          id: `item-${newTicketId}-2`,
          name: `1x ${randomDish2.name}`,
          quantity: 1,
          station: randomDish2.station,
          stationBadge: randomDish2.stationBadge,
          status: 'pendiente',
          cookingNotes: [randomDish2.notes],
          price: randomDish2.price,
          photoUrl: randomDish2.photoUrl,
          checked: false,
          allergens: randomDish2.allergens,
          prepTimeMinutes: parseInt(randomDish2.prepTime) || 8,
        },
      ],
    };

    setTickets((prev) => [newTicket, ...prev]);
    kitchenAudio.playDispatchSound();
  };

  const handleCreateTicket = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4] font-sans">
      {/* Top Main Navigation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeOrdersCount={activeCount}
        urgentCount={urgentCount}
      />

      {/* Main View Area */}
      <main className="w-full pt-16 min-h-screen">
        {currentTab === 'cocina_kds' && (
          <KDSBoard
            tickets={tickets}
            runners={runners}
            onUpdateTickets={setTickets}
            onUpdateRunners={setRunners}
          />
        )}

        {currentTab === 'central_pedidos' && (
          <CentralPedidos
            tickets={tickets}
            onCreateTicket={handleCreateTicket}
            onOpenKDS={() => setCurrentTab('cocina_kds')}
          />
        )}

        {currentTab === 'panel_admin' && <PanelAdmin />}

        {currentTab === 'gestion_usuarios' && <GestionUsuarios />}

        {currentTab === 'configuracion' && (
          <Configuracion
            onResetData={handleResetData}
            onSimulateNewOrder={handleSimulateNewOrder}
          />
        )}
      </main>
    </div>
  );
}
