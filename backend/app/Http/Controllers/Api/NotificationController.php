<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

/**
 * Notifikasi in-app (tombol lonceng) — setiap user cuma bisa baca/tandai
 * notifikasi miliknya sendiri, jadi tidak ada middleware role: di sini,
 * cukup di-scope lewat $request->user()->notifications().
 */
class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->notifications()->paginate(20);
    }

    public function unreadCount(Request $request)
    {
        return ['count' => $request->user()->notifications()->unread()->count()];
    }

    public function markRead(Request $request, Notification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $notification->update(['read_at' => now()]);

        return $notification;
    }

    public function markAllRead(Request $request)
    {
        $request->user()->notifications()->unread()->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai dibaca.']);
    }
}
