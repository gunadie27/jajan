import { NextResponse } from 'next/server';
import { deleteCustomer, updateCustomer } from '@/services/data-service';

export async function DELETE(request: Request) {
  const { customerId } = await request.json();
  try {
    await deleteCustomer(customerId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer via API:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { customerId, customerData } = await request.json();
  try {
    const updatedCustomer = await updateCustomer(customerId, customerData);
    return NextResponse.json({ success: true, customer: updatedCustomer });
  } catch (error) {
    console.error('Error updating customer via API:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
