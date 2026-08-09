<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientProfile;
use App\Models\User;

class DashboardController extends Controller
{
    public function index()
    {
        $total = ClientProfile::count();
        $active = ClientProfile::whereHas('user', fn ($q) => $q->where('is_active', true))->count();
        $inactive = $total - $active;

        return response()->json([
            'overview' => [
                'total_clients' => $total,
                'active_clients' => $active,
                'inactive_clients' => $inactive,
            ],
        ]);
    }
}
