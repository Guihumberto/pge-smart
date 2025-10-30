<template>
    <v-container>
        <SearchBar class="mb-4" />
        <CardGrid class="mb-4" />
        <WorkspaceCard />
        <FeaturedWorkspaces />
    </v-container>
</template>

<script setup>
import SearchBar from '@/components/SearchBar.vue'
import CardGrid from '@/components/CardGrid.vue'
import WorkspaceCard from '@/components/WorkspaceCard.vue'
import FeaturedWorkspaces from '@/components/FeaturedWorkspaces.vue'
</script>

<style scoped>

</style>
