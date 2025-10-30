<template>
    <v-container
        class="fill-height d-flex flex-column justify-center align-center"
    >
        <SearchBar class="mb-4" />
        <CardGrid class="mb-4" />
        <WorkspaceCard />
    </v-container>
</template>

<script setup>
import SearchBar from '@/components/SearchBar.vue'
import CardGrid from '@/components/CardGrid.vue'
import WorkspaceCard from '@/components/WorkspaceCard.vue'
</script>

<style scoped>

</style>
